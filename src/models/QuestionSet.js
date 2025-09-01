// src/models/QuestionSet.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const QuestionSet = sequelize.define('QuestionSet', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否公开'
    },
    // ---- AI生成时的参数 ----
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: false
    },
    domain_major: DataTypes.STRING, // 大方向
    domain_minor: DataTypes.STRING, // 小方向
    domain_detail: DataTypes.STRING, // 详细
    difficulty: DataTypes.STRING,
    questionType: DataTypes.STRING, // 题目类别
    quantity: DataTypes.INTEGER,
    // ---- 状态 ----
    status: {
        type: DataTypes.ENUM('processing', 'completed', 'failed'),
        defaultValue: 'processing',
        comment: '生成状态'
    },
    total_rating_score: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        allowNull: false,
        comment: '总评分'
    },
    rating_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: '评分总次数'
    },
    // ---- 关联 ----
    creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    tableName: 'question_sets',
    timestamps: true
});

User.hasMany(QuestionSet, { foreignKey: 'creator_id' });
QuestionSet.belongsTo(User, { as: 'creator', foreignKey: 'creator_id' });

module.exports = QuestionSet;