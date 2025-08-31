// src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// 聊天功能需要认证
router.use(authMiddleware);

// POST /v1/chat/completions
router.post('/completions', chatController.createChatCompletion);

module.exports = router;