// src/services/correctionService.js
const Correction = require('../models/Correction');
const Question = require('../models/Question');
const AppError = require('../utils/AppError');

class CorrectionService {

    /**
     * 为某个问题创建一条新的纠错建议
     * @param {number} userId - 提交建议的用户ID
     * @param {number} questionId - 被纠错的问题ID
     * @param {string} suggestion - 具体的建议内容
     * @returns {Promise<object>}
     */
    async createCorrection(userId, questionId, suggestion) {
        // 1. 确保被纠错的问题是真实存在的
        const question = await Question.findByPk(questionId);
        if (!question) {
            throw new AppError('您试图纠错的题目不存在。', 404);
        }

        // 2. 创建并保存纠错建议记录
        const newCorrection = await Correction.create({
            user_id: userId,
            question_id: questionId,
            suggestion: suggestion
            // 'status' 字段会自动默认为 'pending'
        });

        return newCorrection;
    }
}

module.exports = new CorrectionService();