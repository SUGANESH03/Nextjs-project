
const {
    Injectable,
    BadRequestException,
    ConflictException
} = require('@nestjs/common');

const bcrypt = require('bcryptjs');

class AgentsService {
    constructor(database) {
        this.database = database;
    }

    async createAgent(data) {
        const { full_name, email, password, phone } = data;

        if (!full_name || !email || !password) {
            throw new BadRequestException(
                'Name, email and password are required'
            );
        }

        if (password.length < 8) {
            throw new BadRequestException(
                'Password must contain at least 8 characters'
            );
        }

        const existing = await this.database.query(
            'SELECT user_id FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (existing.length) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await this.database.query(
            `INSERT INTO users
            (full_name, email, password, phone, role)
            VALUES (?, ?, ?, ?, 'agent')`,
            [
                full_name.trim(),
                email.trim().toLowerCase(),
                hashedPassword,
                phone || null
            ]
        );

        return {
            message: 'Agent created successfully',
            agent_id: result.insertId
        };
    }

    async getAgents() {
        return this.database.query(
            `SELECT user_id, full_name, email, phone, is_active, created_at
             FROM users
             WHERE role = 'agent'
             ORDER BY created_at DESC`
        );
    }
}

Injectable()(AgentsService);

module.exports = AgentsService;
