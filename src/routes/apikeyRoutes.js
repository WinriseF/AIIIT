// src/routes/apiKeyRoutes.js
const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apikeyController');
const authMiddleware = require('../middleware/authMiddleware');

// 所有 /keys 下的路由都需要认证
router.use(authMiddleware);

// PUT /v1/keys
router.put('/', apiKeyController.saveOrUpdateApiKey);

// GET /v1/keys
router.get('/', apiKeyController.getApiKeyProviders);

module.exports = router;