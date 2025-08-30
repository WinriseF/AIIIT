// src/app.js
require('dotenv').config(); // 确保在所有代码之前加载环境变量
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const app = express();

app.use(cors()); // 允许所有来源的跨域请求
app.use(express.json()); // 解析请求体中的 JSON 数据

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Intelligent Quiz API is running successfully!'
    });
});

const authRoutes = require('./routes/authRoutes');
app.use('/v1/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/v1/users', userRoutes);

const apiKeyRoutes = require('./routes/apiKeyRoutes');
app.use('/v1/keys', apiKeyRoutes);

const questionRoutes = require('./routes/questionRoutes');
app.use('/v1/question-sets', questionRoutes);


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