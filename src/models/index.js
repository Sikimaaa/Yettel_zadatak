const sequelize = require('../config/db');
const User = require('./user');
const Task = require('./task');

// relacije
User.hasMany(Task, {foreignKey: 'userId', as: 'tasks'});
Task.belongsTo(User, {foreignKey: 'userId', as: 'user'});

module.exports = {
    sequelize,
    User,
    Task
};
