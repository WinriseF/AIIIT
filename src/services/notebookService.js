// src/services/notebookService.js
const WrongAnswer = require('../models/WrongAnswer');
const Question = require('../models/Question');
const AppError = require('../utils/AppError');

class NotebookService {

    /**
     * 更新或插入用户的错题记录
     * @param {number} userId - 当前用户ID
     * @param {Array<object>} wrongAnswers - 用户答错的题目数组
     * e.g., [{ questionId: 102, userAnswer: "C" }]
     */
    async upsertWrongAnswers(userId, wrongAnswers) {
        if (!wrongAnswers || !Array.isArray(wrongAnswers) || wrongAnswers.length === 0) {
            // 如果前端没有提交任何错题，这并非一个错误，只是无需操作
            return;
        }

        // 使用 Promise.all 来并行处理所有错题的更新/插入操作
        await Promise.all(wrongAnswers.map(async (answer) => {
            const { questionId, userAnswer } = answer;

            if (!questionId || userAnswer === undefined) {
                // 跳过格式不正确的数据项
                console.warn('Skipping invalid wrong answer item:', answer);
                return;
            }

            // Sequelize 的 findOrCreate 在联合主键下行为不佳，我们手动实现 "Upsert"
            const existingRecord = await WrongAnswer.findOne({
                where: {
                    user_id: userId,
                    question_id: questionId
                }
            });

            if (existingRecord) {
                // 如果记录已存在，则更新
                await existingRecord.update({
                    last_user_answer: userAnswer
                });
            } else {
                // 如果记录不存在，则创建
                await WrongAnswer.create({
                    user_id: userId,
                    question_id: questionId,
                    last_user_answer: userAnswer
                });
            }
        }));
    }

    /**
     * 获取用户的错题本列表 (分页)
     * @param {number} userId - 当前用户ID
     * @param {object} options - 分页选项 { page, limit }
     * @returns {Promise<object>}
     */
    async getWrongAnswersByUser(userId, options = {}) {
        const { page = 1, limit = 10 } = options;
        const offset = (page - 1) * limit;

        const { count, rows } = await WrongAnswer.findAndCountAll({
            where: { user_id: userId },
            // 关联出每条错题记录对应的完整题目信息
            include: [{
                model: Question,
                required: true, // 确保只返回题目依然存在的错题记录
                attributes: ['id', 'type', 'content', 'answer'] // 获取题目的核心信息
            }],
            limit: limit,
            offset: offset,
            order: [['updatedAt', 'DESC']] // 按最近一次答错的时间倒序排列
        });

        // 格式化数据，使其更符合API文档的结构
        const formattedWrongQuestions = rows.map(record => {
            return {
                questionId: record.Question.id,
                type: record.Question.type,
                content: record.Question.content,
                correctAnswer: record.Question.answer, // 错题本必须提供答案用于学习
                lastAttempt: {
                    userAnswer: record.last_user_answer,
                    attemptedAt: record.updatedAt // 最近答错的时间
                }
            };
        });

        return {
            wrongQuestions: formattedWrongQuestions,
            pagination: {
                page: page,
                limit: limit,
                total: count
            }
        };
    }

    /**
     * 从用户的错题本中移除一道题
     * @param {number} userId - 当前用户ID
     * @param {number} questionId - 要移除的题目ID
     */
    async removeWrongAnswer(userId, questionId) {
        const result = await WrongAnswer.destroy({
            where: {
                user_id: userId,
                question_id: questionId
            }
        });

        if (result === 0) {
            throw new AppError('该题目不在您的错题本中。', 404);
        }
    }
}

module.exports = new NotebookService();