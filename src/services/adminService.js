// src/services/adminService.js
const User = require('../models/User');
const AppError = require('../utils/AppError');

class AdminService {

    /**
     * (管理员) 更新用户的发布权限
     * @param {number} userId - 目标用户的ID
     * @param {boolean} canPublish - 新的发布权限状态
     * @returns {Promise<User>}
     */
    async updateUserPublicationStatus(userId, canPublish) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('指定的用户不存在。', 404);
        }

        // 管理员不能禁止自己
        if (user.role === 'admin') {
            throw new AppError('不能修改管理员的权限。', 403);
        }

        await user.update({ canPublish });

        return user;
    }

    /**
     * (管理员) 更新指定题库的公开状态
     * @param {number} setId - 题库ID
     * @param {boolean} isPublic - 新的公开状态
     * @returns {Promise<QuestionSet>}
     */
    async updateQuestionSetPublicStatus(setId, isPublic) {
        const questionSet = await QuestionSet.findByPk(setId);
        if (!questionSet) {
            throw new AppError('指定的题库不存在。', 404);
        }
        await questionSet.update({ isPublic });
        return questionSet;
    }

    /**
     * (管理员) 获取所有题库列表 (分页 + 筛选)
     * @param {object} options - 查询选项 { page, limit, isPublic, search }
     * @returns {Promise<object>}
     */
    async getAllQuestionSets(options = {}) {
        const { page = 1, limit = 10, isPublic, search } = options;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (isPublic !== undefined) {
            whereClause.isPublic = isPublic;
        }
        if (search) {
            // 支持按标题或ID搜索
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { id: !isNaN(parseInt(search, 10)) ? parseInt(search, 10) : null }
            ];
        }

        const { count, rows } = await QuestionSet.findAndCountAll({
            where: whereClause,
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'username'] // 关联出创建者信息
            }],
            attributes: ['id', 'title', 'isPublic', 'status', 'createdAt', 'quantity', 'creator_id'],
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        return {
            sets: rows,
            pagination: { page, limit, total: count }
        };
    }
}

module.exports = new AdminService();