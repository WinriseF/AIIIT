// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 映射 POST /register 请求到 authController.register 函数
router.post('/register', authController.register);

// 映射 POST /login 请求到 authController.login 函数
router.post('/login', authController.login);

// 映射 POST /wxLogin 请求到 authController.wxLogin 函数
router.post('/wxLogin', authController.wxLogin);

module.exports = router;