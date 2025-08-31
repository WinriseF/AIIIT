// src/controllers/chatController.js
const chatService = require('../services/chatService');

exports.createChatCompletion = async (req, res) => {
    const userId = req.user.id;
    const { provider, model, messages } = req.body;

    // 参数校验
    if (!provider || !model || !messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ code: 400, message: '请求参数无效。' });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const stream = await chatService.getChatCompletionStream(userId, provider, model, messages);

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            // 只要 delta 存在且不为空，就将其完整地发送给前端
            if (delta && Object.keys(delta).length > 0) {
                // SSE 格式: "data: " + JSON.stringify(data) + "\n"
                res.write(`data: ${JSON.stringify(delta)}\n`);
            }
        }

    } catch (error) {
        const statusCode = error.statusCode || 500;
        const errorMessage = error.message || 'Internal Server Error';
        console.error('Chat stream error:', error);
        res.write(`data: ${JSON.stringify({ error: errorMessage, code: statusCode })}\n\n`);
    } finally {
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
};