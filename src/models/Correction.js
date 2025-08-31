// src/models/Correction.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Question = require('./Question');

const Correction = sequelize.define('Correction', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    suggestion: {
        type: DataTypes.TEXT, // 使用TEXT类型以容纳较长的建议内容
        allowNull: false,
        comment: '用户提交的具体建议'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
        comment: '审核状态'
    },
    // --- 关联字段 ---
    question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Question,
            key: 'id'
        },
        onDelete: 'CASCADE' // 如果题目被删除，相关的纠错建议也应删除
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE' // 如果用户被删除，其提交的建议也应删除
    }
}, {
    tableName: 'corrections',
    timestamps: true // 记录建议的提交时间
});

// 建立关联关系
Correction.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Correction, { foreignKey: 'user_id' });

Correction.belongsTo(Question, { foreignKey: 'question_id' });
Question.hasMany(Correction, { foreignKey: 'question_id' });

module.exports = Correction;