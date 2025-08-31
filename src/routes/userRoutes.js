// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /me 获取当前用户信息
router.get('/me', userController.getCurrentUser);

// POST /me/set-credentials 设置账户凭证
router.post('/me/set-credentials', userController.setCredentials);

module.exports = router;