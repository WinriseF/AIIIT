// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
const helmet = require('helmet');
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// 1. 通用速率限制器: 应用于所有 /v1/ 下的API请求
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟的窗口期
    max: 200, // 在窗口期内，每个IP最多允许200次请求
    message: {
        code: 429,
        message: '请求过于频繁，请稍后再试。'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. 更严格的速率限制器: 应用于认证相关的敏感路由
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 10, // 每个IP在15分钟内最多尝试10次
    message: {
        code: 429,
        message: '登录或注册尝试过于频繁，请15分钟后再试。'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 应用限制器到对应的路由上
app.use('/v1/', apiLimiter); // 将通用限制器应用于所有 /v1/ 路由
app.use('/v1/auth/login', authLimiter); // 将严格限制器应用于登录路由
app.use('/v1/auth/wxLogin', authLimiter); // 微信登录也应用严格限制


app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Intelligent Quiz API is running successfully!'
    });
});

const authRoutes = require('./routes/authRoutes');
app.use('/v1/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/v1/users', userRoutes);

const apiKeyRoutes = require('./routes/apikeyRoutes');
app.use('/v1/keys', apiKeyRoutes);

const questionRoutes = require('./routes/questionRoutes');
app.use('/v1/question-sets', questionRoutes);

const domainRoutes = require('./routes/domainRoutes');
app.use('/v1/domains', domainRoutes);

const quizRoutes = require('./routes/quizRoutes');
app.use('/v1/quizzes', quizRoutes);

const notebookRoutes = require('./routes/notebookRoutes');
app.use('/v1/notebook', notebookRoutes);

const correctionRoutes = require('./routes/correctionRoutes');
app.use('/v1/corrections', correctionRoutes);

const chatRoutes = require('./routes/chatRoutes');
app.use('/v1/chat', chatRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/v1/admin', adminRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        // 测试数据库连接
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');

        await sequelize.sync();
        //await sequelize.sync({ alter: true });
        console.log("All models were synchronized successfully.");

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});