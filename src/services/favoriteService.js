// src/services/favoriteService.js
const Favorite = require('../models/Favorite');
const QuestionSet = require('../models/QuestionSet');
const User = require('../models/User');
const AppError = require('../utils/AppError');

class FavoriteService {

    /**
     * 添加一个题库到用户的收藏夹
     * @param {number} userId - 当前用户ID
     * @param {number} questionSetId - 要收藏的题库ID
     */
    async addFavorite(userId, questionSetId) {
        const questionSet = await QuestionSet.findOne({
            where: { id: questionSetId, isPublic: true, status: 'completed' }
        });
        if (!questionSet) {
            throw new AppError('无法收藏，该题库不存在、是私有的或尚未生成成功。', 404);
        }
        const [favorite, created] = await Favorite.findOrCreate({
            where: { user_id: userId, question_set_id: questionSetId }
        });
        if (!created) {
            throw new AppError('您已经收藏过这个题库了。', 409);
        }
        return favorite;
    }

    /**
     * 从用户的收藏夹中移除一个题库
     * @param {number} userId - 当前用户ID
     * @param {number} questionSetId - 要取消收藏的题库ID
     */
    async removeFavorite(userId, questionSetId) {
        const result = await Favorite.destroy({
            where: { user_id: userId, question_set_id: questionSetId }
        });
        if (result === 0) {
            throw new AppError('您没有收藏过这个题库，无法取消收藏。', 404);
        }
    }

    /**
     * 获取用户的收藏题库列表 (分页)
     * @param {number} userId - 当前用户ID
     * @param {object} options - 分页选项 { page, limit }
     */
    async getFavoritesByUser(userId, options = {}) {
        const { page = 1, limit = 10 } = options;
        const offset = (page - 1) * limit;

        // 直接从 Favorite (收藏记录) 表开始查询
        const { count, rows } = await Favorite.findAndCountAll({
            where: { user_id: userId },
            // 关联出每个收藏记录对应的题库信息
            include: [{
                model: QuestionSet,
                required: true, // 确保只返回那些题库依然存在的收藏
                attributes: ['id', 'title', 'isPublic', 'status', 'createdAt', 'quantity', 'domain_major']
            }],
            limit: limit,
            offset: offset,
            order: [
                // 直接按收藏记录的创建时间(也就是收藏时间)倒序排列
                ['createdAt', 'DESC']
            ]
        });

        // 重组数据，使其符合前端期望的格式
        const formattedSets = rows.map(favoriteInstance => {
            const questionSetData = favoriteInstance.QuestionSet.toJSON();
            // 将收藏时间附加到题库对象上
            questionSetData.favoritedAt = favoriteInstance.createdAt;
            return questionSetData;
        });

        return {
            sets: formattedSets,
            pagination: {
                page: page,
                limit: limit,
                total: count
            }
        };
    }
}

module.exports = new FavoriteService();