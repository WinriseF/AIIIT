// src/controllers/adminController.js
const correctionService = require('../services/correctionService');
const adminService = require('../services/adminService');
const MAX_PAGE_LIMIT = 50;

exports.getCorrections = async (req, res) => {
    // 从查询参数中获取 status，默认为 'pending'
    const status = req.query.status || 'pending';
    const { page, limit } = req.query;

    try {
        const options = {
            page: parseInt(page, 10) || 1,
            limit: Math.min(parseInt(limit, 10) || 10, MAX_PAGE_LIMIT)
        };
        const result = await correctionService.getCorrectionsByStatus(status, options);
        res.status(200).json({
            code: 0,
            message: 'Success',
            data: result
        });
    } catch (error) {
        console.error('Get Corrections Admin Controller Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};

exports.processCorrection = async (req, res) => {
    const { correctionId } = req.params;
    const { status, updatedQuestion } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ code: 400, message: '必须提供一个有效的 status ("approved" 或 "rejected")。' });
    }
    if (status === 'approved' && !updatedQuestion) {
        return res.status(400).json({ code: 400, message: '批准纠错建议时，必须提供 updatedQuestion 数据。' });
    }

    try {
        await correctionService.processCorrection(correctionId, status, updatedQuestion);
        res.status(200).json({
            code: 0,
            message: `纠错建议已成功处理为: ${status}`,
            data: null
        });
    } catch (error) {
        console.error('Process Correction Admin Controller Error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message || 'Internal Server Error' });
    }
};

/**
 * (新增) 更新用户发布权限
 */
exports.updateUserPublicationStatus = async (req, res) => {
    const { userId } = req.params;
    const { canPublish } = req.body;

    if (typeof canPublish !== 'boolean') {
        return res.status(400).json({ code: 400, message: '请求体中必须包含 "canPublish" 字段，且其值必须是布尔类型。' });
    }

    try {
        await adminService.updateUserPublicationStatus(parseInt(userId, 10), canPublish);
        res.status(200).json({
            code: 0,
            message: `用户(ID: ${userId})的发布权限已成功更新为: ${canPublish}`,
            data: null
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message || 'Internal Server Error' });
    }
};