// src/routes/notebookRoutes.js
const express = require('express');
const router = express.Router();
const notebookController = require('../controllers/notebookController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /v1/notebook/wrong-questions
router.get('/wrong-questions', notebookController.getWrongAnswers);

module.exports = router;