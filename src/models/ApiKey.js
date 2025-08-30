// src/models/ApiKey.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const ApiKey = sequelize.define('ApiKey', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'API提供商, e.g., openai, google'
    },
    encrypted_api_key: {
        type: DataTypes.STRING(1024),
        allowNull: false,
        comment: '加密后的API Key'
    },
    iv: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '加密向量'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    tableName: 'api_keys',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'provider']
        }
    ]
});

// 建立模型间关系
User.hasMany(ApiKey, { foreignKey: 'user_id' });
ApiKey.belongsTo(User, { foreignKey: 'user_id' });

module.exports = ApiKey;