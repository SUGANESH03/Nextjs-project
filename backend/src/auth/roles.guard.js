
const {
    Injectable,
    ForbiddenException
} = require('@nestjs/common');

const { Reflector } = require('@nestjs/core');

class RolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }

    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(
            'roles',
            [
                context.getHandler(),
                context.getClass()
            ]
        );

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !requiredRoles.includes(user.role)) {
            throw new ForbiddenException(
                'You do not have permission to access this resource'
            );
        }

        return true;
    }
}

Injectable()(RolesGuard);

require('@nestjs/common').Inject(Reflector)(
    RolesGuard,
    undefined,
    0
);

module.exports = RolesGuard;
