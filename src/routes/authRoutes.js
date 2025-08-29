// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 映射 POST /register 请求到 authController.register 函数
router.post('/register', authController.register);

module.exports = router;