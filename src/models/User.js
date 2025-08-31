// src/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: {
            name: 'unique_username', // 给这个唯一索引起一个固定的名字
            msg: 'Username already exists.'
        }
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    openid: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: {
            name: 'unique_openid', // 给这个唯一索引起一个固定的名字
            msg: 'OpenID already exists.'
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user'
    }
}, {
    timestamps: true,
    tableName: 'users'
});

module.exports = User;