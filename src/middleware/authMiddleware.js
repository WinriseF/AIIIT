// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ code: 401, message: 'Unauthorized: No token provided or invalid format.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 验证JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 从JWT中获取用户ID，并从数据库中查找用户
        // 这一步确保了即使用户被删除，其旧的token也无法通过验证
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(401).json({ code: 401, message: 'Unauthorized: User not found.' });
        } else {
            if (!user.isActive) {
                return res.status(403).json({ code: 403, message: 'Forbidden: Your account is inactive.' });
            }
        }

        // 将用户信息附加到请求对象上，供后续的控制器使用
        req.user = user;

        // 进入下一个中间件或路由处理器
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ code: 401, message: 'Unauthorized: Token has expired.' });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ code: 401, message: 'Unauthorized: Invalid token.' });
        }
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};