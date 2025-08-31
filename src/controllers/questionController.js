// src/controllers/questionController.js
const questionService = require('../services/questionService');

// 3.1 AI 生成一套题目 (异步版)
exports.generateQuestionSet = async (req, res) => {
    const userId = req.user.id;
    const generationParams = req.body; // 参数校验部分省略

    try {
        // 调用Service启动任务
        const newSet = await questionService.requestQuestionSetGeneration(userId, generationParams);

        // 立即返回 202 Accepted
        res.status(202).json({
            code: 0,
            message: '题目生成任务已创建，请稍后查询结果',
            data: {
                setId: newSet.id,
                status: 'processing'
            }
        });
    } catch (error) {
        console.error('generateQuestionSet Controller Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};

// 3.2 获取指定题库详情
exports.getQuestionSet = async (req, res) => {
    const { setId } = req.params;
    const userId = req.user.id;

    try {
        const questionSet = await questionService.getQuestionSetById(setId, userId);
        if (!questionSet) {
            return res.status(404).json({ code: 404, message: '题库不存在' });
        }
        res.status(200).json({
            code: 0,
            message: 'Success',
            data: questionSet
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message });
    }
};

/**
 * 3.3 获取我的题库列表
 */
exports.getMyQuestionSets = async (req, res) => {
    const userId = req.user.id;
    const { page, limit, domain_major, search } = req.query;

    try {
        const options = {
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 10,
            domainMajor: domain_major,
            search: search
        };
        const result = await questionService.getQuestionSetsByCreator(userId, options);
        res.status(200).json({ code: 0, message: 'Success', data: result });
    } catch (error) {
        console.error('getMyQuestionSets Controller Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};


/**
 * 3.4 获取公开题库列表
 */
exports.getPublicQuestionSets = async (req, res) => {
    const { page, limit, domain_major, search } = req.query;

    try {
        const options = {
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 10,
            domainMajor: domain_major,
            search: search
        };
        const result = await questionService.getPublicQuestionSets(options);
        res.status(200).json({ code: 0, message: 'Success', data: result });
    } catch (error) {
        console.error('getPublicQuestionSets Controller Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};

/**
 * 3.5 更新题库信息
 */
exports.updateQuestionSet = async (req, res) => {
    const { setId } = req.params;
    const userId = req.user.id;
    const { title, isPublic } = req.body;

    // 基本校验：确保至少提供了一个要更新的字段
    if (title === undefined && isPublic === undefined) {
        return res.status(400).json({ code: 400, message: '至少需要提供 title 或 isPublic 字段进行更新。' });
    }

    try {
        const updatedQuestionSet = await questionService.updateQuestionSet(setId, userId, { title, isPublic });
        res.status(200).json({
            code: 0,
            message: '题库信息更新成功',
            data: updatedQuestionSet
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message || 'Internal Server Error' });
    }
};