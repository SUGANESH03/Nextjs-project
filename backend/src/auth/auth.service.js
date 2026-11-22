
const {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException
} = require("@nestjs/common");

const bcrypt = require("bcryptjs");

class AuthService {
    constructor(database, jwtService) {
        this.database = database;
        this.jwtService = jwtService;
    }

    // Customer registration
    async register(userData) {
        const { full_name, email, password, phone } = userData;

        if (!full_name || !email || !password) {
            throw new BadRequestException(
                "Name, email and password are required"
            );
        }

        if (password.length < 8) {
            throw new BadRequestException(
                "Password must contain at least 8 characters"
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await this.database.query(
            "SELECT user_id FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (existing.length > 0) {
            throw new ConflictException(
                "Email already registered"
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await this.database.query(
            `INSERT INTO users
            (full_name, email, password, phone, role)
            VALUES (?, ?, ?, ?, 'customer')`,
            [
                full_name.trim(),
                normalizedEmail,
                hashedPassword,
                phone || null
            ]
        );

        return {
            message: "Customer registered successfully",
            user_id: result.insertId
        };
    }

    // Login
    async login(credentials) {
        const { email, password } = credentials;

        if (!email || !password) {
            throw new BadRequestException(
                "Email and password are required"
            );
        }

        const users = await this.database.query(
            `SELECT
                user_id,
                full_name,
                email,
                password,
                role,
                is_active
             FROM users
             WHERE email = ?`,
            [email.trim().toLowerCase()]
        );

        if (!users.length) {
            throw new UnauthorizedException(
                "Invalid email or password"
            );
        }

        const user = users[0];

        if (!user.is_active) {
            throw new UnauthorizedException(
                "Account is inactive"
            );
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            throw new UnauthorizedException(
                "Invalid email or password"
            );
        }

        const payload = {
            sub: user.user_id,
            email: user.email,
            role: user.role
        };

        const accessToken = await this.jwtService.signAsync(
            payload
        );

        return {
            message: "Login successful",
            accessToken,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        };
    }
}

Injectable()(AuthService);

module.exports = {
    AuthService
};
