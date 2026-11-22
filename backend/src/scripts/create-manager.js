
require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

async function createManager() {
    let connection;

    try {
        const fullName = await ask('Manager Name: ');
        const email = await ask('Manager Email: ');
        const password = await ask('Manager Password: ');

        if (!fullName.trim() || !email.trim() || password.length < 8) {
            throw new Error('Enter valid details. Password must have at least 8 characters.');
        }

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [managers] = await connection.execute(
            "SELECT user_id FROM users WHERE role = 'manager' LIMIT 1"
        );

        if (managers.length > 0) {
            throw new Error('A Manager account already exists.');
        }

        const [existing] = await connection.execute(
            'SELECT user_id FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (existing.length > 0) {
            throw new Error('This email is already registered.');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await connection.execute(
            `INSERT INTO users
            (full_name, email, password, role)
            VALUES (?, ?, ?, 'manager')`,
            [
                fullName.trim(),
                email.trim().toLowerCase(),
                hashedPassword
            ]
        );

        console.log('\nManager account created successfully!');

    } catch (error) {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    } finally {
        if (connection) await connection.end();
        rl.close();
    }
}

createManager();
