
const {
    Injectable,
    UnauthorizedException
} = require('@nestjs/common');

const { JwtService } = require('@nestjs/jwt');

class JwtAuthGuard {
    constructor(jwtService) {
        this.jwtService = jwtService;
    }

    async canActivate(context) {
        const request = context.switchToHttp().getRequest();

        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Access token required');
        }

        const token = authHeader.split(' ')[1];

        try {
            request.user = await this.jwtService.verifyAsync(token);
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}

require('@nestjs/common').Injectable()(JwtAuthGuard);

require('@nestjs/common').Inject(JwtService)(
    JwtAuthGuard,
    undefined,
    0
);

module.exports = JwtAuthGuard;
