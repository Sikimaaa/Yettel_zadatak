process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.DATABASE_STORAGE = ':memory:';

const request = require('supertest');
const app = require('../src/app');
const {sequelize, User, Task} = require('../src/models');
const bcrypt = require('bcryptjs');

let basicToken;
let adminToken;
let basicUserId;
let adminUserId;

describe('Yettel Task API - E2E', () => {
    beforeAll(async () => {
        // pun reset šeme
        await sequelize.sync({force: true});

        // kreiramo admina direktno u bazi
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        const admin = await User.create({
            firstName: 'Admin',
            lastName: 'User',
            username: 'admin',
            email: 'admin@example.com',
            password: adminPasswordHash,
            role: 'admin'
        });
        adminUserId = admin.id;

        // registrujemo basic user-a kroz API (da testiramo /register)
        const resRegister = await request(app).post('/api/auth/register').send({
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'basic'
        });

        expect(resRegister.status).toBe(201);
        basicUserId = resRegister.body.id;

        // login basic user
        const resLoginBasic = await request(app).post('/api/auth/login').send({
            usernameOrEmail: 'testuser',
            password: 'password123'
        });

        expect(resLoginBasic.status).toBe(200);
        basicToken = resLoginBasic.body.token;
        expect(basicToken).toBeDefined();

        // login admin
        const resLoginAdmin = await request(app).post('/api/auth/login').send({
            usernameOrEmail: 'admin',
            password: 'admin123'
        });

        expect(resLoginAdmin.status).toBe(200);
        adminToken = resLoginAdmin.body.token;
        expect(adminToken).toBeDefined();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('Auth & User endpoints', () => {
        test('GET /api/users/me vraca trenutno ulogovanog basic user-a', async () => {
            const res = await request(app)
                .get('/api/users/me')
                .set('Authorization', `Bearer ${basicToken}`);

            expect(res.status).toBe(200);
            expect(res.body.username).toBe('testuser');
            expect(res.body.email).toBe('test@example.com');
            expect(res.body.role).toBe('basic');
        });

        test('PUT /api/users/me omogucava basic user-u da apdejtuje svoje podatke', async () => {
            const res = await request(app)
                .put('/api/users/me')
                .set('Authorization', `Bearer ${basicToken}`)
                .send({
                    firstName: 'Updated',
                    email: 'updated@example.com'
                });

            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('Updated');
            expect(res.body.email).toBe('updated@example.com');
        });

        test('GET /api/users (admin) vraca listu svih usera', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            const usernames = res.body.map((u) => u.username).sort();
            expect(usernames).toEqual(['admin', 'testuser'].sort());
        });

        test('PUT /api/users/:id (admin) moze da apdejtuje druge usere', async () => {
            const res = await request(app)
                .put(`/api/users/${basicUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    lastName: 'ChangedByAdmin'
                });

            expect(res.status).toBe(200);
            expect(res.body.lastName).toBe('ChangedByAdmin');
        });

        test('basic user ne moze da pristupi /api/users bez admin role', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${basicToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('Task endpoints', () => {
        let task1;
        let task2;
        let task3;

        test('POST /api/tasks - basic user moze da kreira task', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${basicToken}`)
                .send({body: 'My first task'});

            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.body).toBe('My first task');
            expect(res.body.userId).toBe(basicUserId);
            task1 = res.body;
        });

        test('POST /api/tasks - admin NE moze da kreira task', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({body: 'Admin task that should fail'});

            expect(res.status).toBe(403);
        });

        test('POST /api/tasks - basic user kreira jos 2 taska (za paginaciju)', async () => {
            const res2 = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${basicToken}`)
                .send({body: 'Second task'});

            const res3 = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${basicToken}`)
                .send({body: 'Third task'});

            expect(res2.status).toBe(201);
            expect(res3.status).toBe(201);

            task2 = res2.body;
            task3 = res3.body;
        });

        test('GET /api/tasks (basic) vraca samo svoje taskove sa paginacijom', async () => {
            const res = await request(app)
                .get('/api/tasks?page=1&limit=2&sort=desc')
                .set('Authorization', `Bearer ${basicToken}`);

            expect(res.status).toBe(200);
            expect(res.body.page).toBe(1);
            expect(res.body.totalItems).toBe(3);
            expect(res.body.items.length).toBe(2);

            // posto je sort=desc, poslednji kreirani je prvi
            const bodies = res.body.items.map((t) => t.body);
            expect(bodies[0]).toBe('Third task');
        });

        test('GET /api/tasks (admin) vidi sve taskove svih usera', async () => {
            const res = await request(app)
                .get('/api/tasks')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.totalItems).toBe(3);
            expect(res.body.items[0].user.username).toBeDefined();
        });

        test('GET /api/tasks/:id (basic) moze da vidi svoj task', async () => {
            const res = await request(app)
                .get(`/api/tasks/${task1.id}`)
                .set('Authorization', `Bearer ${basicToken}`);

            expect(res.status).toBe(200);
            expect(res.body.body).toBe('My first task');
        });

        test('GET /api/tasks/:id (basic) ne moze da vidi tudje taskove', async () => {
            // da simuliramo tudji task, kreiramo nov user + task direktno u bazi
            const anotherPass = await bcrypt.hash('pass123', 10);
            const another = await User.create({
                firstName: 'Another',
                lastName: 'User',
                username: 'another',
                email: 'another@example.com',
                password: anotherPass,
                role: 'basic'
            });

            const foreignTask = await Task.create({
                body: 'Foreign task',
                userId: another.id
            });

            const res = await request(app)
                .get(`/api/tasks/${foreignTask.id}`)
                .set('Authorization', `Bearer ${basicToken}`);

            expect(res.status).toBe(403);
        });

        test('PUT /api/tasks/:id (basic) moze da apdejtuje svoj task', async () => {
            const res = await request(app)
                .put(`/api/tasks/${task1.id}`)
                .set('Authorization', `Bearer ${basicToken}`)
                .send({body: 'Updated first task'});

            expect(res.status).toBe(200);
            expect(res.body.body).toBe('Updated first task');
        });

        test('PUT /api/tasks/:id (admin) moze da apdejtuje bilo koji task', async () => {
            const res = await request(app)
                .put(`/api/tasks/${task2.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({body: 'Admin updated task 2'});

            expect(res.status).toBe(200);
            expect(res.body.body).toBe('Admin updated task 2');
        });

        test('DELETE /api/tasks/:id (basic) moze da obrise svoj task', async () => {
            const res = await request(app)
                .delete(`/api/tasks/${task3.id}`)
                .set('Authorization', `Bearer ${basicToken}`);

            expect(res.status).toBe(204);

            const inDb = await Task.findByPk(task3.id);
            expect(inDb).toBeNull();
        });

        test('DELETE /api/tasks/:id (basic) ne moze da brise tudje taskove', async () => {
            // uzmemo neki task koji pripada drugom useru ili ga kreiramo
            const anotherPass = await bcrypt.hash('pass456', 10);
            const another = await User.create({
                firstName: 'Third',
                lastName: 'User',
                username: 'thirduser',
                email: 'third@example.com',
                password: anotherPass,
                role: 'basic'
            });

            const foreignTask = await Task.create({
                body: 'Task from third user',
                userId: another.id
            });

            const res = await request(app)
                .delete(`/api/tasks/${foreignTask.id}`)
                .set('Authorization', `Bearer ${basicToken}`);

            expect(res.status).toBe(403);
        });
    });
});
