// src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const AppError = require('../utils/AppError');

class AuthService {

    /**
     * 处理账户密码登录的业务逻辑
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Promise<object>} 包含Token和过期时间的对象
     */
    async login(username, password) {
        const user = await User.findOne({ where: { username } });
        if (!user || !user.isActive) {
            throw new AppError('Invalid username or password, or account is inactive', 401);
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new AppError('Invalid username or password.', 401);
        }

        const payload = { id: user.id, username: user.username, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        return {
            token: token,
            expiresIn: parseInt(process.env.JWT_EXPIRES_IN_SECONDS, 10)
        };
    }

    /**
     * 处理微信登录的业务逻辑
     * @param {string} code - 微信登录凭证
     * @returns {Promise<object>} 包含Token和账户设置状态的对象
     */
    async wxLogin(code) {
        const { WX_APPID, WX_SECRET } = process.env;
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;

        const response = await axios.get(url);
        const { openid, session_key, errcode, errmsg } = response.data;

        if (errcode) {
            throw new AppError(`微信登录失败: ${errmsg}`, 500);
        }

        let user = await User.findOne({ where: { openid } });
        if (!user) {
            user = await User.create({ openid });
        } else {
            if (!user.isActive) {
                throw new AppError('Your account is inactive. Please contact support.', 403);
            }
        }

        const payload = { id: user.id, openid: user.openid, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        return {
            token: token,
            isAccountSet: !!user.username
        };
    }
}

// 导出 AuthService 的单例
module.exports = new AuthService();