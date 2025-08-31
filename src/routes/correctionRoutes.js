// src/routes/correctionRoutes.js
const express = require('express');
const router = express.Router();
const correctionController = require('../controllers/correctionController');
const authMiddleware = require('../middleware/authMiddleware');

// 提交纠错建议需要认证
router.use(authMiddleware);

// POST /v1/corrections
router.post('/', correctionController.submitCorrection);

module.exports = router;