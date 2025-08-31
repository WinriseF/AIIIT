// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const favoriteController = require('../controllers/favoriteController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/public', questionController.getPublicQuestionSets);

router.use(authMiddleware);

router.get('/favorites', favoriteController.getFavoriteQuestionSets);

// GET /v1/question-sets/my
router.get('/my', questionController.getMyQuestionSets);

// POST /v1/question-sets/generate
router.post('/generate', questionController.generateQuestionSet);

// PUT /v1/question-sets/:setId
router.put('/:setId', questionController.updateQuestionSet);

router.post('/:setId/favorite', favoriteController.addFavorite);
router.delete('/:setId/favorite', favoriteController.removeFavorite);

// GET /v1/question-sets/:setId
router.get('/:setId', questionController.getQuestionSet);

module.exports = router;