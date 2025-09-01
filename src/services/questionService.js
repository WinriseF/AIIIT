// src/services/questionService.js
const OpenAI = require('openai');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const apiKeyService = require('./apiKeyService');
const QuestionSet = require('../models/QuestionSet');
const Question = require('../models/Question');
const { Jieba, dict } = require('@node-rs/jieba');
const AppError = require('../utils/AppError');
const axios = require('axios');

const jieba = new Jieba(dict);
const STOP_WORDS = new Set(['的', '是', '了', '在', '也', '和', '就', '都', '或', '等', '一个', '什么', '请', '关于', 'the', 'a', 'is', 'what', 'and', 'or']);

class QuestionService {
    /**
     * 构建发送给 AI 的指令 (Prompt) - 最终版，支持多种题型
     * @param {object} options - 用户选择的参数
     * @returns {string} - 构建好的 prompt 字符串
     */
    _buildPrompt(options) {
        const { domain_major, domain_minor, domain_detail, difficulty, questionType, quantity } = options;

        let jsonFormatExample;
        const questionTypeLowerCase = questionType.toLowerCase();

        if (questionTypeLowerCase === 'multiple_choice' || questionTypeLowerCase === '选择题') {
            jsonFormatExample = `
            {
              "questions": [
                {
                  "type": "multiple_choice",
                  "content": {
                    "question": "题干文本",
                    "options": ["选项A", "选项B", "选项C", "选项D"]
                  },
                  "answer": {
                    "correctOption": "C",
                    "explanation": "对答案的详细解析"
                  }
                }
              ]
            }`;
        } else if (questionTypeLowerCase === 'true_false' || questionTypeLowerCase === '判断题') {
            jsonFormatExample = `
            {
              "questions": [
                {
                  "type": "true_false",
                  "content": {
                    "question": "需要判断对错的陈述句"
                  },
                  "answer": {
                    "correct": true, // 或者 false
                    "explanation": "对这句陈述的详细解析"
                  }
                }
              ]
            }`;
        } else if (questionTypeLowerCase === 'subjective' || questionTypeLowerCase === '主观题') {
            jsonFormatExample = `
            {
              "questions": [
                {
                  "type": "subjective",
                  "content": {
                    "question": "需要用户回答的主观问题"
                  },
                  "answer": {
                    "reference": "这道题的参考答案或评分要点",
                    "explanation": "关于这个问题的背景知识和解析"
                  }
                }
              ]
            }`;
        } else {
            throw new Error(`当前不支持 "${questionType}" 这种题目类型。`);
        }

        return `
        请你扮演一位资深的 ${domain_major} 领域的专家。
        请根据以下要求，生成一套关于 "${domain_minor} - ${domain_detail}" 的面试题。
        要求:
        1. 题目数量: ${quantity} 道。
        2. 题目难度: ${difficulty}。
        3. 题目类型: ${questionType}。
        4. 你的回答必须是一个纯粹的、语法正确的 JSON 对象。
        5. 绝对不要在 JSON 对象之外添加任何说明、注释、前言或总结性文字。
        6. 你的整个响应内容必须严格遵循以下 JSON 结构。
        JSON 结构示例:
        ${jsonFormatExample}
        `;
    }

    _parseAiResponse(responseContent) {
        // ... (此方法保持不变)
        let cleanString = responseContent.trim();
        const match = cleanString.match(/^```json\s*([\s\S]*?)\s*```$/);
        if (match && match[1]) {
            cleanString = match[1];
        }
        try {
            return JSON.parse(cleanString);
        } catch (parseError) {
            console.error("--- JSON PARSE FAILED ---");
            console.error("Original AI Response:", responseContent);
            console.error("Cleaned String Attempted to Parse:", cleanString);
            console.error("Parse Error Details:", parseError);
            console.error("--- END JSON PARSE FAILED ---");
            throw new Error(`AI返回了无法修复的无效JSON格式。错误: ${parseError.message}`);
        }
    }

    /**
     * 相似度去重工具
     */
    _deduplicateQuestions(questions, threshold = 0.7) {
        if (!questions || questions.length <= 1) {
            return questions;
        }

        const getKeywords = (text) => {
            const cleanedText = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '');
            const words = jieba.cut(cleanedText);
            return new Set(words.filter(w => w.trim() && !STOP_WORDS.has(w)));
        };

        const calculateJaccard = (setA, setB) => {
            const intersection = new Set([...setA].filter(x => setB.has(x)));
            const union = new Set([...setA, ...setB]);
            return intersection.size / union.size;
        };

        const uniqueQuestions = [];
        const allKeywords = questions.map(q => getKeywords(q.content.question));

        for (let i = 0; i < questions.length; i++) {
            let isDuplicate = false;
            for (let j = 0; j < uniqueQuestions.length; j++) {
                const uniqueIndex = questions.indexOf(uniqueQuestions[j]);
                const similarity = calculateJaccard(allKeywords[i], allKeywords[uniqueIndex]);
                if (similarity > threshold) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                uniqueQuestions.push(questions[i]);
            }
        }
        return uniqueQuestions;
    }

    /**
     * (最终重构版) 后台执行的AI生成任务，支持并行和去重
     */
    async _processGenerationInBackground(userId, setId, generationParams) {
        const BATCH_SIZE = 10;
        const SIMILARITY_THRESHOLD = 0.7;
        const { quantity, ...baseParams } = generationParams;

        const t = await sequelize.transaction();
        try {
            const apiKey = await apiKeyService.getDecryptedApiKey(userId, baseParams.provider);
            if (!apiKey) throw new Error(`用户(ID: ${userId})未配置'${baseParams.provider}'的API Key。`);

            let openai;
            const providerLowerCase = baseParams.provider.toLowerCase();
            if (providerLowerCase === 'siliconflow' || providerLowerCase === '硅基流动') {
                openai = new OpenAI({ apiKey, baseURL: 'https://api.siliconflow.cn/v1' });
            } else if (providerLowerCase === 'openai') {
                openai = new OpenAI({ apiKey });
            } else {
                throw new Error(`暂不支持'${baseParams.provider}'提供商。`);
            }

            const batches = [];
            for (let i = 0; i < quantity; i += BATCH_SIZE) {
                batches.push(Math.min(BATCH_SIZE, quantity - i));
            }

            const batchPromises = batches.map(batchQuantity => {
                const prompt = this._buildPrompt({ ...baseParams, quantity: batchQuantity });
                return openai.chat.completions.create({
                    model: baseParams.model,
                    messages: [{ role: "user", content: prompt }],
                });
            });

            const results = await Promise.allSettled(batchPromises);

            let allQuestions = [];
            let successfulBatches = 0;
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    const responseContent = result.value.choices[0].message.content;
                    const aiResponseJson = this._parseAiResponse(responseContent);
                    if (aiResponseJson.questions && Array.isArray(aiResponseJson.questions)) {
                        allQuestions.push(...aiResponseJson.questions);
                        successfulBatches++;
                    }
                } else {
                    console.error("一个并行的AI请求批次失败了:", result.reason);
                }
            });

            if (successfulBatches === 0) {
                throw new Error("所有AI请求批次都失败了，无法生成题库。");
            }

            const uniqueQuestions = this._deduplicateQuestions(allQuestions, SIMILARITY_THRESHOLD);

            const questionsToCreate = uniqueQuestions.map(q => ({
                type: q.type,
                content: q.content,
                answer: q.answer,
                question_set_id: setId
            }));

            await Question.bulkCreate(questionsToCreate, { transaction: t });

            const finalStatus = successfulBatches < batches.length ? 'completed_with_errors' : 'completed';
            await QuestionSet.update({ status: finalStatus, quantity: uniqueQuestions.length }, { where: { id: setId }, transaction: t });

            await t.commit();
            console.log(`题库(ID: ${setId})生成成功，状态: ${finalStatus}，最终题目数: ${uniqueQuestions.length}。`);

        } catch (error) {
            await t.rollback();
            await QuestionSet.update({ status: 'failed' }, { where: { id: setId } });
            console.error(`--- BACKGROUND TASK FAILED (Set ID: ${setId}) ---`);
            console.error("Full Error Object:", error);
            console.error("--- END OF ERROR REPORT ---");
        }
    }


    /**
     * 验证单个问题对象的结构是否符合 'multiple_choice' 规范
     * @param {object} q - 问题对象
     * @returns {{isValid: boolean, error: string|null}}
     */
    _validateQuestionObject(q) {
        if (!q || typeof q !== 'object') {
            return { isValid: false, error: '题目必须是一个对象。' };
        }
        if (q.type !== 'multiple_choice') {
            return { isValid: false, error: `当前仅支持 "multiple_choice" 类型的导入，但题目类型为 "${q.type}"。` };
        }
        if (!q.content || typeof q.content.question !== 'string' || !Array.isArray(q.content.options) || q.content.options.length < 2) {
            return { isValid: false, error: 'content 字段格式错误，必须包含 question 字符串和至少2个选项的 options 数组。' };
        }
        if (!q.answer || typeof q.answer.correctOption !== 'string' || typeof q.answer.explanation !== 'string') {
            return { isValid: false, error: 'answer 字段格式错误，必须包含 correctOption 和 explanation 字符串。' };
        }
        return { isValid: true, error: null };
    }


    /**
     * 将自定义文本格式解析为标准题目对象数组
     * @param {string} textData - 包含所有题目的长字符串
     * @returns {Array<object>} - 标准格式的题目对象数组
     */
    _parseTextToQuestions(textData) {
        if (typeof textData !== 'string' || textData.trim() === '') {
            throw new AppError('导入的文本内容不能为空。', 400);
        }

        // 1. 按题号分割成独立的题目块
        const questionBlocks = textData.trim().split(/\[\d+\]\./).filter(Boolean);
        const parsedQuestions = [];

        for (let i = 0; i < questionBlocks.length; i++) {
            const block = questionBlocks[i].trim();
            const lines = block.split('\n').filter(line => line.trim() !== '');

            if (lines.length < 4) { // 至少需要题干、2个选项、1个答案
                const err = new AppError('文本格式错误', 400);
                err.details = `第 ${i + 1} 题内容不完整，无法解析。`;
                throw err;
            }

            const questionText = lines[0].trim();
            const options = [];
            const optionRegex = /\[([A-Z])\]\.(.*)/;
            let answer = null;
            let analysis = '';

            lines.slice(1).forEach(line => {
                const optionMatch = line.match(optionRegex);
                if (optionMatch) {
                    options.push(optionMatch[2].trim());
                } else if (line.startsWith('[answer]:')) {
                    answer = line.substring('[answer]:'.length).trim();
                } else if (line.startsWith('[analysis]:')) {
                    analysis = line.substring('[analysis]:'.length).trim();
                }
            });

            // 2. 验证解析结果
            if (options.length < 2 || !answer) {
                const err = new AppError('文本格式错误', 400);
                err.details = `第 ${i + 1} 题缺少选项或答案，请检查格式是否为 '[A].'、'[answer]:'。`;
                throw err;
            }

            // 3. 组装成标准对象
            parsedQuestions.push({
                type: 'multiple_choice',
                content: {
                    question: questionText,
                    options: options
                },
                answer: {
                    correctOption: answer,
                    explanation: analysis
                }
            });
        }
        return parsedQuestions;
    }


    /**
     * 从用户导入的数据创建题库
     */
    async createQuestionSetFromImport(userId, questionSetData, importType, questionsRawData) {
        let parsedQuestions = [];

        try {
            if (importType === 'json') {
                if (!Array.isArray(questionsRawData)) {
                    throw new AppError('JSON 格式导入失败： "questions" 字段必须是一个数组。', 400);
                }
                parsedQuestions = questionsRawData;
            } else if (importType === 'text') {
                parsedQuestions = this._parseTextToQuestions(questionsRawData);
            }
        } catch (error) {
            // 重新抛出解析阶段的错误，让Controller层能捕获到详细信息
            throw error;
        }


        if (parsedQuestions.length === 0) {
            throw new AppError('数据校验失败：未能解析出任何有效的题目。', 400);
        }

        // 统一对解析后的数组进行结构验证
        for (let i = 0; i < parsedQuestions.length; i++) {
            const validation = this._validateQuestionObject(parsedQuestions[i]);
            if (!validation.isValid) {
                const err = new AppError('数据校验失败', 400);
                err.details = `第 ${i + 1} 道题的格式不符合标准：${validation.error}`;
                throw err;
            }
        }

        const t = await sequelize.transaction();
        try {
            // 1. 创建 QuestionSet
            const newSet = await QuestionSet.create({
                ...questionSetData,
                creator_id: userId,
                status: 'completed',
                quantity: parsedQuestions.length
            }, { transaction: t });

            // 2. 准备 Question 数据
            const questionsToCreate = parsedQuestions.map(q => ({
                ...q,
                question_set_id: newSet.id
            }));

            // 3. 批量创建 Question
            await Question.bulkCreate(questionsToCreate, { transaction: t });

            await t.commit();
            return newSet;

        } catch (error) {
            await t.rollback();
            // 抛出一个通用错误，具体的解析/验证错误在之前已经处理
            throw new AppError('数据库操作失败，无法保存导入的题库。', 500);
        }
    }



    async requestQuestionSetGeneration(userId, generationParams) {
        const newSet = await QuestionSet.create({
            ...generationParams,
            creator_id: userId,
            status: 'processing'
        });
        this._processGenerationInBackground(userId, newSet.id, generationParams);
        return newSet;
    }

    async getQuestionSetById(setId, userId) {
        const questionSet = await QuestionSet.findByPk(setId, {
            include: [{
                model: Question,
                as: 'questions',
                attributes: { exclude: ['question_set_id', 'createdAt', 'updatedAt'] }
            }]
        });
        if (questionSet && !questionSet.isPublic && questionSet.creator_id !== userId) {
            throw new AppError('无权访问该题库', 403);
        }
        return questionSet;
    }

    /**
     * 获取指定创建者的题库列表 (分页 + 筛选 + 搜索)
     * @param {number} userId - 创建者用户ID
     * @param {object} options - 包含分页和筛选条件的对象 { page, limit, domainMajor, search }
     * @returns {Promise<object>}
     */
    async getQuestionSetsByCreator(userId, options = {}) {
        const { page = 1, limit = 10, domainMajor, search } = options;
        const offset = (page - 1) * limit;

        const whereClause = { creator_id: userId };
        if (domainMajor) {
            whereClause.domain_major = domainMajor;
        }
        if (search) {
            whereClause.title = { [Op.like]: `%${search}%` };
        }

        const { count, rows } = await QuestionSet.findAndCountAll({
            where: whereClause,
            attributes: ['id', 'title', 'isPublic', 'status', 'createdAt', 'quantity', 'domain_major'],
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        return {
            sets: rows,
            pagination: { page, limit, total: count }
        };
    }

    /**
     * 获取所有公开的题库列表 (分页 + 筛选 + 搜索)
     * @param {object} options - 包含分页和筛选条件的对象 { page, limit, domainMajor, search }
     * @returns {Promise<object>}
     */
    async getPublicQuestionSets(options = {}) {
        const { page = 1, limit = 10, domainMajor, search } = options;
        const offset = (page - 1) * limit;

        const whereClause = { isPublic: true, status: 'completed' };
        if (domainMajor) {
            whereClause.domain_major = domainMajor;
        }
        if (search) {
            whereClause.title = { [Op.like]: `%${search}%` };
        }

        const { count, rows } = await QuestionSet.findAndCountAll({
            where: whereClause,
            attributes: ['id', 'title', 'isPublic', 'status', 'createdAt', 'quantity', 'domain_major'],
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        return {
            sets: rows,
            pagination: { page, limit, total: count }
        };
    }

    /**
     * (内部辅助方法) 获取微信 access_token
     * 在生产环境中, 强烈建议将获取到的 token 进行全局缓存并设置定时刷新, 避免频繁请求导致触发API调用频率限制。
     * @returns {Promise<string>}
     */
    async _getWxAccessToken() {
        const { WX_APPID, WX_SECRET } = process.env;
        if (!WX_APPID || !WX_SECRET) {
            // 这种属于服务器配置错误，对用户不可见
            throw new AppError('服务器配置错误：微信小程序 AppID 或 Secret 未配置。', 500);
        }
        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_SECRET}`;

        try {
            const response = await axios.get(url);
            const { access_token, errcode, errmsg } = response.data;

            if (!access_token || errcode) {
                throw new Error(`获取 access_token 失败 (code: ${errcode}): ${errmsg}`);
            }
            return access_token;
        } catch (error) {
            throw new AppError(`调用微信 token 接口失败: ${error.message}`, 500);
        }
    }

    /**
     * (内部辅助方法) 将长文本按指定长度分割成数组
     * @param {string} text - 需要分割的文本
     * @param {number} maxLength - 每个分段的最大长度
     * @returns {string[]}
     */
    _splitTextIntoChunks(text, maxLength) {
        const chunks = [];
        for (let i = 0; i < text.length; i += maxLength) {
            chunks.push(text.substring(i, i + maxLength));
        }
        return chunks;
    }

    /**
     * (内部辅助方法) 调用微信内容安全API审查单个文本块
     * @param {string} content - 要审查的文本
     * @param {string} accessToken - 有效的 access_token
     */
    async _checkTextWithWxApi(content, accessToken) {
        const checkUrl = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`;
        try {
            const checkResponse = await axios.post(checkUrl,
                { content },
                {
                    headers: { 'Content-Type': 'application/json' },
                    // 微信API要求UTF-8, axios默认就是
                }
            );

            const { result, errcode } = checkResponse.data;

            if (errcode === 87014 || (result && result.suggest !== 'pass')) {
                return { isSafe: false, data: checkResponse.data };
            }
            if (errcode !== 0) {
                throw new Error(`微信内容安全接口返回错误 (code: ${errcode})`);
            }
            // errcode 为 0 且 suggest 为 pass 代表内容正常
            return { isSafe: true, data: checkResponse.data };

        } catch (error) {
            // 重新抛出一个可控的错误
            throw new AppError(`调用微信内容安全服务时发生网络或API错误: ${error.message}`, 500);
        }
    }


    /**
     * 更新指定ID的题库信息
     * @param {number} setId - 题库ID
     * @param {number} userId - 当前操作的用户ID
     * @param {object} updateData - 需要更新的数据, e.g., { title, isPublic }
     * @returns {Promise<object|null>} 更新后的题库对象
     */
    async updateQuestionSet(setId, userId, updateData) {
        // 为了进行内容审查，我们需要加载题库及其包含的所有题目
        const questionSet = await QuestionSet.findByPk(setId, {
            include: [{
                model: Question,
                as: 'questions',
            }]
        });

        if (!questionSet) {
            throw new AppError('题库不存在', 404);
        }

        if (questionSet.creator_id !== userId) {
            throw new AppError('无权修改该题库', 403);
        }

        // --- 当用户尝试将题库设置为公开时, 触发微信内容安全审查 ---
        if (updateData.isPublic === true && questionSet.isPublic === false) {
            // 1. 收集所有需要审查的文本内容
            let fullTextContent = [
                questionSet.title,
                questionSet.domain_major,
                questionSet.domain_minor,
                questionSet.domain_detail,
                questionSet.provider,
                questionSet.model
            ].filter(Boolean).join('\n'); // 使用换行符分隔，更清晰

            questionSet.questions.forEach(q => {
                fullTextContent += `\n${q.content.question || ''}`;
                if (q.content.options && Array.isArray(q.content.options)) {
                    fullTextContent += `\n${q.content.options.join('\n')}`;
                }
                if (q.answer.explanation) {
                    fullTextContent += `\n${q.answer.explanation}`;
                }
            });

            if (fullTextContent.trim()) {
                // 2. 将长文本分割成符合微信API要求的块 (每块最多2500字符)
                const textChunks = this._splitTextIntoChunks(fullTextContent, 2500);

                // 3. 获取 access_token
                const accessToken = await this._getWxAccessToken();

                // 4. 依次审查每一个文本块
                for (const chunk of textChunks) {
                    const result = await this._checkTextWithWxApi(chunk, accessToken);
                    if (!result.isSafe) {
                        // 如果任何一个块审查不通过，则立即终止并返回错误
                        throw new AppError('题库无法公开，因为内容未通过微信内容安全审查。请检查标题、描述或题目内容后重试。', 400); // 400 Bad Request
                    }
                }
            }
        }

        // 只允许更新指定的字段
        const allowedUpdates = {};
        if (updateData.title !== undefined) {
            allowedUpdates.title = updateData.title;
        }
        if (updateData.isPublic !== undefined) {
            allowedUpdates.isPublic = updateData.isPublic;
        }

        if (Object.keys(allowedUpdates).length === 0) {
            return questionSet;
        }

        // 使用原始的 questionSet 实例进行更新
        await questionSet.update(allowedUpdates);

        // 为了避免返回过多的题目数据，可以重新查询一次仅包含题库信息的数据返回
        const updatedQuestionSetInfo = await QuestionSet.findByPk(setId);
        return updatedQuestionSetInfo;
    }
}

module.exports = new QuestionService();