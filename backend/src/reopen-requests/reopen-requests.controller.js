
const {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Req,
    Param,
    ParseIntPipe,
    UseGuards,
    Inject
} = require('@nestjs/common');

const ReopenRequestsService =
    require('./reopen-requests.service');

const JwtAuthGuard = require('../auth/jwt-auth.guard');

class ReopenRequestsController {
    constructor(service) {
        this.service = service;
    }

    createRequest(id, req, body) {
        return this.service.createRequest(
            id,
            req.user,
            body
        );
    }

    getRequests(req) {
        return this.service.getRequests(req.user);
    }

    reviewRequest(id, req, body) {
        return this.service.reviewRequest(
            id,
            req.user,
            body
        );
    }

    getMyRequests(req) {
        return this.service.getMyRequests(req.user);
    }
}

Inject(ReopenRequestsService)(
    ReopenRequestsController,
    undefined,
    0
);

Controller('reopen-requests')(ReopenRequestsController);
UseGuards(JwtAuthGuard)(ReopenRequestsController);

// POST /api/reopen-requests/:ticketId
Post(':ticketId')(
    ReopenRequestsController.prototype,
    'createRequest',
    Object.getOwnPropertyDescriptor(
        ReopenRequestsController.prototype,
        'createRequest'
    )
);

Param('ticketId', ParseIntPipe)(
    ReopenRequestsController.prototype,
    'createRequest',
    0
);
Req()(ReopenRequestsController.prototype, 'createRequest', 1);
Body()(ReopenRequestsController.prototype, 'createRequest', 2);

// GET /api/reopen-requests
Get()(
    ReopenRequestsController.prototype,
    'getRequests',
    Object.getOwnPropertyDescriptor(
        ReopenRequestsController.prototype,
        'getRequests'
    )
);
Req()(ReopenRequestsController.prototype, 'getRequests', 0);

// GET /api/reopen-requests/my-requests
Get('my-requests')(
    ReopenRequestsController.prototype,
    'getMyRequests',
    Object.getOwnPropertyDescriptor(
        ReopenRequestsController.prototype,
        'getMyRequests'
    )
);
Req()(ReopenRequestsController.prototype, 'getMyRequests', 0);

// PATCH /api/reopen-requests/:id/review
Patch(':id/review')(
    ReopenRequestsController.prototype,
    'reviewRequest',
    Object.getOwnPropertyDescriptor(
        ReopenRequestsController.prototype,
        'reviewRequest'
    )
);

Param('id', ParseIntPipe)(
    ReopenRequestsController.prototype,
    'reviewRequest',
    0
);
Req()(ReopenRequestsController.prototype, 'reviewRequest', 1);
Body()(ReopenRequestsController.prototype, 'reviewRequest', 2);

module.exports = ReopenRequestsController;
