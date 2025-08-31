// src/services/questionService.js
const OpenAI = require('openai');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const apiKeyService = require('./apiKeyService');
const QuestionSet = require('../models/QuestionSet');
const Question = require('../models/Question');
const { Jieba, dict } = require('@node-rs/jieba');
const AppError = require('../utils/AppError');

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
     * 更新指定ID的题库信息
     * @param {number} setId - 题库ID
     * @param {number} userId - 当前操作的用户ID
     * @param {object} updateData - 需要更新的数据, e.g., { title, isPublic }
     * @returns {Promise<object|null>} 更新后的题库对象
     */
    async updateQuestionSet(setId, userId, updateData) {
        const questionSet = await QuestionSet.findByPk(setId);

        if (!questionSet) {
            // 使用我们自定义的AppError来传递特定的HTTP状态码
            throw new AppError('题库不存在', 404);
        }

        if (questionSet.creator_id !== userId) {
            throw new AppError('无权修改该题库', 403); // 403 Forbidden
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
            // 如果没有提供任何可更新的字段，则无需操作
            return questionSet;
        }

        await questionSet.update(allowedUpdates);

        return questionSet;
    }
}

module.exports = new QuestionService();