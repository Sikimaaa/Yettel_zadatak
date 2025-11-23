const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');

const Task = sequelize.define('Task', {
    body: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'tasks'
});

module.exports = Task;
