const db = require('../database');
require('dotenv').config();
const { DataTypes } = require('sequelize');

const redisData = db.define('redisData', {
    "id": {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "name": {
        type: DataTypes.STRING,
        allowNull: false
    },
    "age": {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false,
    freezeTableName: true,
    schema: process.env.DB_SCHEMA
})

module.exports = redisData;