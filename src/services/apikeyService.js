// src/services/apiKeyService.js
const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

// 加密算法
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET;

class ApiKeyService {
    /**
     * 加密文本
     * @param {string} text - 要加密的文本
     * @returns {{iv: string, encryptedData: string}}
     */
    encrypt(text) {
        if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
            throw new Error("API_KEY_ENCRYPTION_SECRET is not set or not 32 bytes long.");
        }
        const iv = crypto.randomBytes(16); // 生成一个随机的16字节初始化向量
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
    }

    /**
     * 解密文本
     * @param {{iv: string, encryptedData: string}} hash - 包含iv和加密数据的对象
     * @returns {string} 解密后的文本
     */
    decrypt(hash) {
        if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
            throw new Error("API_KEY_ENCRYPTION_SECRET is not set or not 32 bytes long.");
        }
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), Buffer.from(hash.iv, 'hex'));
        let decrypted = decipher.update(Buffer.from(hash.encryptedData, 'hex'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    /**
     * 为用户保存或更新 API Key
     * @param {number} userId - 用户ID
     * @param {string} provider - API提供商
     * @param {string} apiKey - 用户的API Key
     */
    async saveOrUpdateApiKey(userId, provider, apiKey) {
        const { iv, encryptedData } = this.encrypt(apiKey);

        // 查找是否已存在该用户的该provider的key
        const existingKey = await ApiKey.findOne({ where: { user_id: userId, provider: provider } });

        if (existingKey) {
            // 更新
            await existingKey.update({
                encrypted_api_key: encryptedData,
                iv: iv
            });
        } else {
            // 创建
            await ApiKey.create({
                user_id: userId,
                provider: provider,
                encrypted_api_key: encryptedData,
                iv: iv
            });
        }
    }

    /**
     * 获取用户已配置的 API Key 提供商列表
     * @param {number} userId - 用户ID
     * @returns {Promise<string[]>}
     */
    async getApiKeyProviders(userId) {
        const keys = await ApiKey.findAll({
            where: { user_id: userId },
            attributes: ['provider']
        });
        return keys.map(key => key.provider);
    }

    /**
     * 获取用户指定提供商的解密后的 API Key
     * @param {number} userId - 用户ID
     * @param {string} provider - API提供商
     * @returns {Promise<string|null>} 解密后的API Key
     */
    async getDecryptedApiKey(userId, provider) {
        const apiKeyRecord = await ApiKey.findOne({
            where: { user_id: userId, provider: provider }
        });

        if (!apiKeyRecord) {
            return null;
        }

        return this.decrypt({
            iv: apiKeyRecord.iv,
            encryptedData: apiKeyRecord.encrypted_api_key
        });
    }
}

module.exports = new ApiKeyService();