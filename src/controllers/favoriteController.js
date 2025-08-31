// src/controllers/favoriteController.js
const favoriteService = require('../services/favoriteService');

exports.addFavorite = async (req, res) => {
    const userId = req.user.id;
    const { setId } = req.params;

    try {
        await favoriteService.addFavorite(userId, parseInt(setId, 10));
        res.status(201).json({
            code: 0,
            message: '收藏成功',
            data: null
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message || 'Internal Server Error' });
    }
};

exports.removeFavorite = async (req, res) => {
    const userId = req.user.id;
    const { setId } = req.params;

    try {
        await favoriteService.removeFavorite(userId, parseInt(setId, 10));
        res.status(204).send();
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ code: statusCode, message: error.message || 'Internal Server Error' });
    }
};

exports.getFavoriteQuestionSets = async (req, res) => {
    const userId = req.user.id;
    const { page, limit } = req.query;

    try {
        const options = {
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 10
        };
        const result = await favoriteService.getFavoritesByUser(userId, options);
        res.status(200).json({
            code: 0,
            message: 'Success',
            data: result
        });
    } catch (error) {
        console.error('getFavoriteQuestionSets Controller Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};