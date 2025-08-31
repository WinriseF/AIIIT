// src/controllers/userController.js
const userService = require('../services/userService');

// 1.5 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
    // req.user 是由我们的 authMiddleware 附加到请求对象上的
    const userId = req.user.id;

    try {
        const user = await userService.getUserById(userId);
        if (!user) {
            // 这种情况理论上不应发生，因为中间件已经验证过用户存在
            return res.status(404).json({ code: 404, message: 'User not found.' });
        }

        // 格式化输出以匹配API文档
        const userData = {
            userId: user.id,
            username: user.username,
            createdAt: user.createdAt
        };

        res.status(200).json({
            code: 0,
            message: 'Success',
            data: userData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};

/**
 * 1.2 设置账户凭证
 */
exports.setCredentials = async (req, res) => {
    const userId = req.user.id;
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ code: 400, message: '必须提供用户名和密码。' });
    }

    try {
        await userService.setCredentials(userId, username, password);
        res.status(200).json({
            code: 0,
            message: '账户凭证设置成功',
            data: null
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message || 'Internal Server Error' });
    }
};