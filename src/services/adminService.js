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
}

module.exports = new AdminService();