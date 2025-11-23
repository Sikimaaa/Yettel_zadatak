const bcrypt = require('bcryptjs');
const {User} = require('../models');
const {Op} = require('sequelize');

// helper za update (koristi i /me i admin update)
const applyUserUpdates = async (user, data) => {
    const updatableFields = ['firstName', 'lastName', 'username', 'email'];

    updatableFields.forEach(field => {
        if (data[field] !== undefined) {
            user[field] = data[field];
        }
    });

    if (data.password) {
        user.password = await bcrypt.hash(data.password, 10);
    }

    await user.save();
    return user;
};

const getMe = (req, res) => {
    const {user} = req;
    return res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role
    });
};

const updateMe = async (req, res, next) => {
    try {
        const {user} = req;

        // proveri unikatnost username/email ako se menjaju
        const {username, email} = req.body;

        if (username) {
            const existing = await User.findOne({
                where: {
                    username,
                    id: {[Op.ne]: user.id}
                }
            });
            if (existing) {
                return res.status(400).json({message: 'Username already taken'});
            }
        }

        if (email) {
            const existingEmail = await User.findOne({
                where: {
                    email,
                    id: {[Op.ne]: user.id}
                }
            });
            if (existingEmail) {
                return res.status(400).json({message: 'Email already taken'});
            }
        }

        const updated = await applyUserUpdates(user, req.body);

        return res.json({
            id: updated.id,
            firstName: updated.firstName,
            lastName: updated.lastName,
            username: updated.username,
            email: updated.email,
            role: updated.role
        });
    } catch (err) {
        next(err);
    }
};

// ADMIN: lista svih usera (nije traženo, ali korisno)
const listUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'role']
        });
        return res.json(users);
    } catch (err) {
        next(err);
    }
};

// ADMIN: update bilo kog usera (plus sebe)
const updateUserById = async (req, res, next) => {
    try {
        const {id} = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        const {username, email} = req.body;

        if (username) {
            const existing = await User.findOne({
                where: {
                    username,
                    id: {[Op.ne]: user.id}
                }
            });
            if (existing) {
                return res.status(400).json({message: 'Username already taken'});
            }
        }

        if (email) {
            const existingEmail = await User.findOne({
                where: {
                    email,
                    id: {[Op.ne]: user.id}
                }
            });
            if (existingEmail) {
                return res.status(400).json({message: 'Email already taken'});
            }
        }

        const updated = await applyUserUpdates(user, req.body);

        return res.json({
            id: updated.id,
            firstName: updated.firstName,
            lastName: updated.lastName,
            username: updated.username,
            email: updated.email,
            role: updated.role
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMe,
    updateMe,
    listUsers,
    updateUserById
};
