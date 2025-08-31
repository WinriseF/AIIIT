// src/models/Favorite.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const QuestionSet = require('./QuestionSet');

const Favorite = sequelize.define('Favorite', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true, // 联合主键的一部分
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE', // 如果用户被删除，其收藏记录也被删除
        onUpdate: 'CASCADE'
    },
    question_set_id: {
        type: DataTypes.INTEGER,
        primaryKey: true, // 联合主键的一部分
        references: {
            model: QuestionSet,
            key: 'id'
        },
        onDelete: 'CASCADE', // 如果题库被删除，其收藏记录也应被删除
        onUpdate: 'CASCADE'
    }
}, {
    tableName: 'user_favorites',
    timestamps: true, // Sequelize会自动添加 createdAt 和 updatedAt
    updatedAt: false // 收藏关系通常只需要创建时间
});

// 建立多对多关系
User.belongsToMany(QuestionSet, {
    through: Favorite,
    foreignKey: 'user_id',
    as: 'favoriteQuestionSets'
});

QuestionSet.belongsToMany(User, {
    through: Favorite,
    foreignKey: 'question_set_id',
    as: 'favoritedByUsers'
});

module.exports = Favorite;