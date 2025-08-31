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