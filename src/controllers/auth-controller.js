const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const register = async (req, res, next) => {
    try {
        const { firstName, lastName, username, email, password, role } = req.body;

        const existing = await User.findOne({
            where: { username }
        });
        const existingEmail = await User.findOne({
            where: { email }
        });

        if (existing) {
            return res.status(400).json({ message: 'Username already taken' });
        }
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstName,
            lastName,
            username,
            email,
            password: passwordHash,
            role: role === 'admin' ? 'admin' : 'basic' // da se ne pravi slučajno nešto drugo
        });

        return res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { usernameOrEmail, password } = req.body;

        const user = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: usernameOrEmail },
                    { email: usernameOrEmail }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login
};
