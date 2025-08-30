// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// 定义 GET /me 路由
// 在 userController.getCurrentUser 执行之前，会先执行 authMiddleware 进行身份验证
router.get('/me', authMiddleware, userController.getCurrentUser);

module.exports = router;