// src/controllers/correctionController.js
const correctionService = require('../services/correctionService');

exports.submitCorrection = async (req, res) => {
    const userId = req.user.id;
    const { questionId, suggestion } = req.body;

    if (!questionId || !suggestion) {
        return res.status(400).json({ code: 400, message: '必须提供 questionId 和 suggestion。' });
    }

    try {
        await correctionService.createCorrection(userId, questionId, suggestion);
        res.status(201).json({
            code: 0,
            message: '感谢您的反馈，我们将尽快审核！',
            data: null
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message || 'Internal Server Error' });
    }
};