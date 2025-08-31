// src/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const notebookController = require('../controllers/notebookController');
const authMiddleware = require('../middleware/authMiddleware');

// 所有 /quizzes 路由都需要认证
router.use(authMiddleware);

// POST /v1/quizzes/submit
router.post('/submit', notebookController.submitQuiz);

module.exports = router;