// src/services/favoriteService.js
const Favorite = require('../models/Favorite');
const QuestionSet = require('../models/QuestionSet');
const AppError = require('../services/questionService');

class FavoriteService {

    /**
     * 添加一个题库到用户的收藏夹
     * @param {number} userId - 当前用户ID
     * @param {number} questionSetId - 要收藏的题库ID
     */
    async addFavorite(userId, questionSetId) {
        // 检查题库是否存在且是公开的
        const questionSet = await QuestionSet.findOne({
            where: { id: questionSetId, isPublic: true, status: 'completed' }
        });

        if (!questionSet) {
            throw new AppError('无法收藏，该题库不存在、是私有的或尚未生成成功。', 404);
        }

        // 尝试创建收藏记录
        const [favorite, created] = await Favorite.findOrCreate({
            where: { user_id: userId, question_set_id: questionSetId }
        });

        if (!created) {
            throw new AppError('您已经收藏过这个题库了。', 409); // 409 Conflict
        }

        return favorite;
    }

    /**
     * 从用户的收藏夹中移除一个题库
     * @param {number} userId - 当前用户ID
     * @param {number} questionSetId - 要取消收藏的题库ID
     */
    async removeFavorite(userId, questionSetId) {
        // 尝试删除指定的收藏记录
        const result = await Favorite.destroy({
            where: {
                user_id: userId,
                question_set_id: questionSetId
            }
        });
        // destroy 方法返回被删除的行数。如果为0，说明该收藏记录原本就不存在。
        if (result === 0) {
            throw new AppError('您没有收藏过这个题库，无法取消收藏。', 404);
        }
    }
}

module.exports = new FavoriteService();