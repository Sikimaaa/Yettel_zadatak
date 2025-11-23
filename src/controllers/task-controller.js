const { Task, User } = require('../models');
const { Op } = require('sequelize');

// helper za paginaciju
const getPaginationParams = (req) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC'; // default DESC (najnoviji prvi)

    return { page, limit, offset, sort };
};

// basic user kreira task za sebe
const createTask = async (req, res, next) => {
    try {
        if (req.user.role !== 'basic') {
            return res.status(403).json({ message: 'Admins cannot create tasks' });
        }

        const { body } = req.body;
        const task = await Task.create({
            body,
            userId: req.user.id
        });

        return res.status(201).json(task);
    } catch (err) {
        next(err);
    }
};

// list tasks: basic -> samo svoje; admin -> svi
// paginacija + sort (createdAt)
const listTasks = async (req, res, next) => {
    try {
        const { limit, offset, sort, page } = getPaginationParams(req);

        const where = {};
        if (req.user.role === 'basic') {
            where.userId = req.user.id;
        }

        const { rows, count } = await Task.findAndCountAll({
            where,
            limit,
            offset,
            order: [['createdAt', sort]],
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'email', 'role']
            }]
        });

        return res.json({
            page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            items: rows
        });
    } catch (err) {
        next(err);
    }
};

// get jedan task
const getTaskById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const task = await Task.findByPk(id, {
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'email', 'role']
            }]
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (req.user.role === 'basic' && task.userId !== req.user.id) {
            return res.status(403).json({ message: 'You can access only your own tasks' });
        }

        return res.json(task);
    } catch (err) {
        next(err);
    }
};

// update task: basic -> svoje; admin -> bilo koji
const updateTask = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { body } = req.body;

        const task = await Task.findByPk(id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (req.user.role === 'basic' && task.userId !== req.user.id) {
            return res.status(403).json({ message: 'You can update only your own tasks' });
        }

        task.body = body ?? task.body;
        await task.save();

        return res.json(task);
    } catch (err) {
        next(err);
    }
};

// (opciono) brisanje taska
const deleteTask = async (req, res, next) => {
    try {
        const { id } = req.params;
        const task = await Task.findByPk(id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (req.user.role === 'basic' && task.userId !== req.user.id) {
            return res.status(403).json({ message: 'You can delete only your own tasks' });
        }

        await task.destroy();
        return res.status(204).send();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createTask,
    listTasks,
    getTaskById,
    updateTask,
    deleteTask
};
