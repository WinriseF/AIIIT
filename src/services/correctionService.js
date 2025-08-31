// src/services/correctionService.js
const Correction = require('../models/Correction');
const Question = require('../models/Question');
const User = require('../models/User');
const sequelize = require('../config/database');
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

    /**
     * 根据状态获取纠错建议列表 (分页)
     * @param {string} status - 要筛选的状态 (e.g., 'pending')
     * @param {object} options - 分页选项 { page, limit }
     * @returns {Promise<object>}
     */
    async getCorrectionsByStatus(status, options = {}) {
        const { page = 1, limit = 10 } = options;
        const offset = (page - 1) * limit;

        const { count, rows } = await Correction.findAndCountAll({
            where: { status: status },
            // 关联出提交建议的用户和被纠错的题目信息，方便管理员审核
            include: [
                {
                    model: User,
                    attributes: ['id', 'username'] // 只返回非敏感信息
                },
                {
                    model: Question,
                    attributes: ['id', 'content', 'answer']
                }
            ],
            limit: limit,
            offset: offset,
            order: [['createdAt', 'ASC']] // 按提交时间升序排列
        });

        return {
            corrections: rows,
            pagination: {
                page: page,
                limit: limit,
                total: count
            }
        };
    }

    /**
     * 处理一条纠错建议，并选择性地更新关联的题目
     * @param {number} correctionId - 纠错建议的ID
     * @param {string} status - 新的状态 ('approved' 或 'rejected')
     * @param {object} [updatedQuestionData] - (可选) 修正后的题目数据
     * @returns {Promise<object>}
     */
    async processCorrection(correctionId, status, updatedQuestionData) {
        // 启动一个数据库事务
        const t = await sequelize.transaction();

        try {
            const correction = await Correction.findByPk(correctionId, { transaction: t });
            if (!correction) {
                throw new AppError('找不到指定的纠错建议。', 404);
            }

            correction.status = status;
            await correction.save({ transaction: t });

            if (status === 'approved' && updatedQuestionData) {
                const question = await Question.findByPk(correction.question_id, { transaction: t });
                if (!question) {
                    // 如果题目在建议提交后被删除了，这是一个异常情况
                    throw new AppError('关联的题目已不存在，无法更新。', 404);
                }

                // 只更新 content 和 answer 字段
                await question.update({
                    content: updatedQuestionData.content,
                    answer: updatedQuestionData.answer
                }, { transaction: t });
            }

            await t.commit();
            return correction;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}

module.exports = new CorrectionService();