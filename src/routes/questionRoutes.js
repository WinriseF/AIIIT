// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/public', questionController.getPublicQuestionSets);

router.use(authMiddleware);

// GET /v1/question-sets/my
router.get('/my', questionController.getMyQuestionSets);

// POST /v1/question-sets/generate
router.post('/generate', questionController.generateQuestionSet);

// PUT /v1/question-sets/:setId
router.put('/:setId', questionController.updateQuestionSet);

// GET /v1/question-sets/:setId
router.get('/:setId', questionController.getQuestionSet);

module.exports = router;