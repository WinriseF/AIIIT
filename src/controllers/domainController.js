// src/controllers/domainController.js

// 在這裡定義我們應用支持的所有“大方向”分類
const MAJOR_DOMAINS = [
    "互联网",
    "医疗健康",
    "学习教育",
    "金融财经",
    "法律法规",
    "科学研究",
    "人文社科",
    "其他"
];

/**
 * 獲取所有預定義的 domain_major 列表
 */
exports.getMajorDomains = (req, res) => {
    try {
        res.status(200).json({
            code: 0,
            message: 'Success',
            data: {
                domains: MAJOR_DOMAINS
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: 'Internal Server Error' });
    }
};