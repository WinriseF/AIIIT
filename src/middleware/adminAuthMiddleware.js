// src/middleware/adminAuthMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuthMiddleware = async (req, res, next) => {
    // --- 步骤1: 基础认证 (与 authMiddleware 逻辑类似) ---
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ code: 401, message: 'Unauthorized: No token provided or invalid format.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({ code: 401, message: 'Unauthorized: User not found or inactive.' });
        }

        // 将用户信息附加到请求对象上
        req.user = user;

        // --- 步骤2: 权限校验 (核心) ---
        // 在确认用户身份后，检查其角色
        if (user.role !== 'admin') {
            // 如果不是管理员，则返回 403 Forbidden
            return res.status(403).json({ code: 403, message: 'Forbidden: You do not have administrator privileges.' });
        }

        // 如果是管理员，则放行，进入下一个处理程序
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

module.exports = adminAuthMiddleware;