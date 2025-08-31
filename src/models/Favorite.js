// src/models/Favorite.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const QuestionSet = require('./QuestionSet');

const Favorite = sequelize.define('Favorite', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    question_set_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: QuestionSet,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    }
}, {
    tableName: 'user_favorites',
    timestamps: true,
    updatedAt: false
});

// 一个 Favorite 记录属于一个 User
Favorite.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Favorite, { foreignKey: 'user_id' });

// 一个 Favorite 记录属于一个 QuestionSet
Favorite.belongsTo(QuestionSet, { foreignKey: 'question_set_id' });
QuestionSet.hasMany(Favorite, { foreignKey: 'question_set_id' });

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