// src/controllers/apiKeyController.js
const apiKeyService = require('../services/apiKeyService');

// 2.1 保存/更新用户的 API Key
exports.saveOrUpdateApiKey = async (req, res) => {
    const { provider, apiKey } = req.body;
    const userId = req.user.id;

    if (!provider || !apiKey) {
        return res.status(400).json({ code: 400, message: 'Provider and apiKey are required.' });
    }

    try {
        await apiKeyService.saveOrUpdateApiKey(userId, provider, apiKey);
        res.status(200).json({
            code: 0,
            message: 'API Key 保存成功',
            data: null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};

// 2.2 获取用户已配置的 API Key 提供商列表
exports.getApiKeyProviders = async (req, res) => {
    const userId = req.user.id;
    try {
        const providers = await apiKeyService.getApiKeyProviders(userId);
        res.status(200).json({
            code: 0,
            message: 'Success',
            data: {
                providers: providers
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};