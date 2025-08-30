// src/controllers/questionController.js
const questionService = require('../services/questionService');

// 3.1 AI 生成一套题目 (异步版)
exports.generateQuestionSet = async (req, res) => {
    const userId = req.user.id;
    const generationParams = req.body; // 参数校验部分省略，可按需添加

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

// 3.2 获取指定题库详情 (新增)
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