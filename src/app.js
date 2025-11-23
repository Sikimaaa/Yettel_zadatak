require('dotenv').config();
const express = require('express');
const app = express();

const authRoutes = require('./routes/auth-route');
const userRoutes = require('./routes/user-route');
const taskRoutes = require('./routes/task-route');

require('./config/swagger')(app);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

// global error handler
app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(err.status || 500).json({message: err.message || 'Internal server error'});
});

module.exports = app;
