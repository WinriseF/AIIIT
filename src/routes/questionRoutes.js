// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /v1/question-sets/my
router.get('/my', questionController.getMyQuestionSets);

// POST /v1/question-sets/generate
router.post('/generate', questionController.generateQuestionSet);

// GET /v1/question-sets/:setId
router.get('/:setId', questionController.getQuestionSet);

module.exports = router;