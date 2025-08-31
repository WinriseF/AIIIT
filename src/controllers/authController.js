// src/controllers/authController.js
const authService = require('../services/authService');

/**
 * 通用错误处理函数
 * @param {object} res - Express响应对象
 * @param {Error} error - 捕获到的错误
 */
const handleError = (res, error) => {
    console.error(error);
    // 如果是我们自定义的业务错误，使用其状态码，否则默认为500
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        code: statusCode,
        message: error.message || 'Internal Server Error'
    });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ code: 400, message: 'Username and password are required.' });
    }
    try {
        const result = await authService.login(username, password);
        res.status(200).json({
            code: 0,
            message: '登录成功',
            data: result
        });
    } catch (error) {
        handleError(res, error);
    }
};

exports.wxLogin = async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ code: 400, message: 'JSCODE is required.' });
    }
    try {
        const result = await authService.wxLogin(code);
        res.status(200).json({
            code: 0,
            message: '微信登录成功',
            data: result
        });
    } catch (error) {
        handleError(res, error);
    }
};