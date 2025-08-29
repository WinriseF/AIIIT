// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 1.4 账户密码注册
exports.register = async (req, res) => {
    const { username, password } = req.body;

    // 基本的输入验证
    if (!username || !password) {
        return res.status(400).json({ code: 400, message: 'Username and password are required.' });
    }

    try {
        // 检查用户名是否已存在
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            // 409 Conflict: 对应API文档中的错误响应
            return res.status(409).json({ code: 409, message: 'Username already exists.' });
        }

        // 使用 bcrypt 对密码进行哈希加密
        const password_hash = await bcrypt.hash(password, 10);

        // 在数据库中创建新用户
        const newUser = await User.create({
            username,
            password_hash
        });

        // 201 Created: 对应API文档中的成功响应
        res.status(201).json({
            code: 0,
            message: '用户注册成功',
            data: {
                userId: newUser.id,
                username: newUser.username
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};
