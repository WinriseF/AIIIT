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