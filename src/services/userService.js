// src/services/userService.js
const User = require('../models/User');

class UserService {
    /**
     * 根据用户ID获取用户信息
     * @param {number} userId - 用户ID
     * @returns {Promise<object|null>} 用户信息对象或null
     */
    async getUserById(userId) {
        const user = await User.findByPk(userId, {
            // 确保不返回敏感信息
            attributes: ['id', 'username', 'openid', 'isActive', 'role', 'createdAt']
        });
        return user;
    }
}

module.exports = new UserService();