// src/models/WrongAnswer.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Question = require('./Question');

const WrongAnswer = sequelize.define('WrongAnswer', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true, // 联合主键的一部分
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    question_id: {
        type: DataTypes.INTEGER,
        primaryKey: true, // 联合主键的一部分
        references: {
            model: Question,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    last_user_answer: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: '用户最后一次提交的错误答案'
    }
}, {
    tableName: 'wrong_answers',
    timestamps: true, // createdAt (首次答错时间), updatedAt (最近答错时间)
});

// 建立关联关系
WrongAnswer.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(WrongAnswer, { foreignKey: 'user_id' });

WrongAnswer.belongsTo(Question, { foreignKey: 'question_id' });
Question.hasMany(WrongAnswer, { foreignKey: 'question_id' });

module.exports = WrongAnswer;