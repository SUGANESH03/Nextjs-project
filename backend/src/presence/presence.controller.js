
const {
    Controller,
    Post,
    Get,
    Req,
    Inject,
    UseGuards
} = require('@nestjs/common');

const PresenceService = require('./presence.service');
const JwtAuthGuard = require('../auth/jwt-auth.guard');

class PresenceController {
    constructor(presenceService) {
        this.presenceService = presenceService;
    }

    setOnline(req) {
        return this.presenceService.setOnline(req.user);
    }

    setOffline(req) {
        return this.presenceService.setOffline(req.user);
    }

    heartbeat(req) {
        return this.presenceService.heartbeat(req.user);
    }

    getPresence(req) {
        return this.presenceService.getPresence(req.user);
    }
}

Inject(PresenceService)(PresenceController, undefined, 0);

Controller('presence')(PresenceController);
UseGuards(JwtAuthGuard)(PresenceController);

Post('online')(
    PresenceController.prototype,
    'setOnline',
    Object.getOwnPropertyDescriptor(
        PresenceController.prototype,
        'setOnline'
    )
);
Req()(PresenceController.prototype, 'setOnline', 0);

Post('offline')(
    PresenceController.prototype,
    'setOffline',
    Object.getOwnPropertyDescriptor(
        PresenceController.prototype,
        'setOffline'
    )
);
Req()(PresenceController.prototype, 'setOffline', 0);

Post('heartbeat')(
    PresenceController.prototype,
    'heartbeat',
    Object.getOwnPropertyDescriptor(
        PresenceController.prototype,
        'heartbeat'
    )
);
Req()(PresenceController.prototype, 'heartbeat', 0);

Get()(
    PresenceController.prototype,
    'getPresence',
    Object.getOwnPropertyDescriptor(
        PresenceController.prototype,
        'getPresence'
    )
);
Req()(PresenceController.prototype, 'getPresence', 0);

module.exports = PresenceController;
