// src/models/Question.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const QuestionSet = require('./QuestionSet');

const Question = sequelize.define('Question', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    type: {
        type: DataTypes.STRING, // 'multiple_choice', 'true_false', 'subjective'
        allowNull: false,
        comment: '题目类型'
    },
    content: {
        type: DataTypes.JSON, // 存储题干、选项等
        allowNull: false,
        comment: '题目内容'
        // 示例: { "question": "...", "options": ["A", "B"] }
    },
    answer: {
        type: DataTypes.JSON, // 存储答案、解析等
        allowNull: false,
        comment: '题目答案'
        // 示例: { "correctOption": "A", "explanation": "..." }
    },
    // ---- 关联 ----
    question_set_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: QuestionSet,
            key: 'id'
        }
    }
}, {
    tableName: 'questions',
    timestamps: true
});

// 一个题库 (QuestionSet) 包含多个题目 (Question)
QuestionSet.hasMany(Question, { as: 'questions', foreignKey: 'question_set_id' });
Question.belongsTo(QuestionSet, { foreignKey: 'question_set_id' });

module.exports = Question;