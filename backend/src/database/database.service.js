
const mysql = require('mysql2/promise');

class DatabaseService {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ticket_management',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    async onModuleInit() {
        const connection = await this.pool.getConnection();

        try {
            await connection.ping();
            console.log('MySQL Database Connected Successfully');
        } finally {
            connection.release();
        }
    }

    async query(sql, params = []) {
        const [rows] = await this.pool.execute(sql, params);
        return rows;
    }

    async onModuleDestroy() {
        await this.pool.end();
    }
}

module.exports = DatabaseService;
