// src/controllers/notebookController.js
const notebookService = require('../services/notebookService');
const MAX_PAGE_LIMIT = 50;

exports.submitQuiz = async (req, res) => {
    const userId = req.user.id;
    const { wrongAnswers } = req.body;

    if (!wrongAnswers) {
        return res.status(400).json({ code: 400, message: '请求体中缺少 "wrongAnswers" 字段。' });
    }

    try {
        await notebookService.upsertWrongAnswers(userId, wrongAnswers);
        res.status(200).json({
            code: 0,
            message: '答题记录已成功保存',
            data: null
        });
    } catch (error) {
        console.error('Submit Quiz Controller Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};


exports.getWrongAnswers = async (req, res) => {
    const userId = req.user.id;
    const { page, limit } = req.query;

    try {
        const options = {
            page: parseInt(page, 10) || 1,
            limit: Math.min(parseInt(limit, 10) || 10, MAX_PAGE_LIMIT)
        };
        const result = await notebookService.getWrongAnswersByUser(userId, options);
        res.status(200).json({
            code: 0,
            message: 'Success',
            data: result
        });
    } catch (error) {
        console.error('Get Wrong Answers Controller Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};

exports.removeWrongAnswer = async (req, res) => {
    const userId = req.user.id;
    const { questionId } = req.params;

    try {
        await notebookService.removeWrongAnswer(userId, parseInt(questionId, 10));
        // 成功删除后，返回 204 No Content
        res.status(204).send();
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message || 'Internal Server Error' });
    }
};