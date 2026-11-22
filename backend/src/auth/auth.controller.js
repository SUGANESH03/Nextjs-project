
const {
    Controller,
    Post,
    Get,
    Body,
    Req,
    Inject,
    UseGuards
} = require('@nestjs/common');

const { AuthService } = require('./auth.service');
const JwtAuthGuard = require('./jwt-auth.guard');

class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    register(body) {
        return this.authService.register(body);
    }

    login(body) {
        return this.authService.login(body);
    }

    getProfile(request) {
        return {
            message: 'Profile fetched successfully',
            user: request.user
        };
    }
}

Inject(AuthService)(AuthController, undefined, 0);

Controller('auth')(AuthController);

Post('register')(
    AuthController.prototype,
    'register',
    Object.getOwnPropertyDescriptor(AuthController.prototype, 'register')
);
Body()(AuthController.prototype, 'register', 0);

Post('login')(
    AuthController.prototype,
    'login',
    Object.getOwnPropertyDescriptor(AuthController.prototype, 'login')
);
Body()(AuthController.prototype, 'login', 0);

Get('profile')(
    AuthController.prototype,
    'getProfile',
    Object.getOwnPropertyDescriptor(AuthController.prototype, 'getProfile')
);

UseGuards(JwtAuthGuard)(
    AuthController.prototype,
    'getProfile',
    Object.getOwnPropertyDescriptor(AuthController.prototype, 'getProfile')
);

Req()(AuthController.prototype, 'getProfile', 0);

module.exports = AuthController;
