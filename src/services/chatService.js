// src/services/chatService.js
const OpenAI = require('openai');
const apiKeyService = require('./apikeyService');
const AppError = require('../utils/AppError');

class ChatService {

    /**
     * @returns {Promise<Stream>} AI返回的数据流对象
     */
    async getChatCompletionStream(userId, provider, model, messages) {
        const apiKey = await apiKeyService.getDecryptedApiKey(userId, provider);
        if (!apiKey) {
            throw new AppError(`您尚未配置'${provider}'的API Key。`, 400);
        }

        try {
            let openai;
            const providerLowerCase = provider.toLowerCase();
            if (providerLowerCase === 'siliconflow' || providerLowerCase === '硅基流动') {
                openai = new OpenAI({ apiKey, baseURL: 'https://api.siliconflow.cn/v1' });
            } else if (providerLowerCase === 'openai') {
                openai = new OpenAI({ apiKey });
            } else {
                throw new AppError(`暂不支持'${provider}'提供商。`, 400);
            }

            const stream = await openai.chat.completions.create({
                model: model,
                messages: messages,
                stream: true, // 请求以流的形式返回
            });

            // 直接返回 stream 对象，交由 Controller 处理
            return stream;

        } catch (error) {
            console.error(`调用'${provider}'聊天API失败:`, error);
            if (error instanceof OpenAI.APIError) {
                throw new AppError(`调用'${provider}' API失败: ${error.message}`, 500);
            }
            throw new AppError(error.message || '与AI聊天时发生未知错误。', 500);
        }
    }
}

module.exports = new ChatService();