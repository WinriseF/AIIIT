// src/app.js

// 1. 导入核心模块
require('dotenv').config(); // 确保在所有代码之前加载环境变量
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database'); // 注意路径变为 './'

// 2. 创建 Express 应用实例
const app = express();

// 3. 使用核心中间件
app.use(cors()); // 允许所有来源的跨域请求
app.use(express.json()); // 解析请求体中的 JSON 数据

// 4. 定义基础路由 (用于测试服务是否正常运行)
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Intelligent Quiz API is running successfully!'
    });
});

// 5. 引入并使用业务路由 (我们稍后会逐一创建)
// const authRoutes = require('./routes/authRoutes');
// app.use('/v1/auth', authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        // 测试数据库连接
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');

        await sequelize.sync({ alter: true });
        console.log("All models were synchronized successfully.");

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});