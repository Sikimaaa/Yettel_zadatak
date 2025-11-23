require('dotenv').config();
const app = require('./src/app');
const { sequelize, User } = require('./src/models');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3001;

sequelize
    .sync({ alter: false })
    .then(async () => {
        console.log('Database synced');

        // default admin (ako ne postoji)
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            const passwordHash = await bcrypt.hash('admin123', 10);
            await User.create({
                firstName: 'Admin',
                lastName: 'User',
                username: 'admin',
                email: 'admin@example.com',
                password: passwordHash,
                role: 'admin'
            });
            console.log('Default admin created: admin / admin123');
        }

        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Unable to sync DB:', err);
    });
