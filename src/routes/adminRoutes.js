// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

router.use(adminAuthMiddleware);


// 一个测试路由，用于验证守卫是否工作正常
router.get('/dashboard', (req, res) => {
    res.status(200).json({
        code: 0,
        message: `欢迎回来，管理员 ${req.user.username}！`,
        data: {
            userId: req.user.id,
            role: req.user.role
        }
    });
});

router.get('/corrections', adminController.getCorrections);

router.put('/corrections/:correctionId', adminController.processCorrection);

router.put('/users/:userId/publication-status', adminController.updateUserPublicationStatus);

module.exports = router;