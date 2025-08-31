// src/services/userService.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');

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

    /**
     * 为已登录用户设置用户名和密码
     * @param {number} userId - 当前登录用户的ID
     * @param {string} username - 新的用户名
     * @param {string} password - 新的密码
     */
    async setCredentials(userId, username, password) {
        // 1. 检查新用户名是否已被其他用户占用
        const existingUserWithUsername = await User.findOne({ where: { username } });
        if (existingUserWithUsername && existingUserWithUsername.id !== userId) {
            throw new AppError('该用户名已被占用', 409); // 409 Conflict
        }

        // 2. 查找当前用户
        const currentUser = await User.findByPk(userId);
        if (!currentUser) {
            // 理论上不应该发生，因为用户已通过JWT认证
            throw new AppError('用户不存在', 404);
        }

        // 3. 检查用户是否已经设置过凭证
        if (currentUser.username && currentUser.password_hash) {
            throw new AppError('您已设置过账户凭证，不可重复设置。', 400);
        }

        // 4. 哈希新密码
        const password_hash = await bcrypt.hash(password, 10);

        // 5. 更新用户信息
        await currentUser.update({
            username: username,
            password_hash: password_hash
        });
    }
}

module.exports = new UserService();