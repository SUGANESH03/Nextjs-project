
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

const TicketsService = require('./tickets.service');
const JwtAuthGuard = require('../auth/jwt-auth.guard');

class TicketsController {
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }

    createTicket(req, body) {
        return this.ticketsService.createTicket(req.user, body);
    }

    getTickets(req) {
        return this.ticketsService.getTickets(req.user);
    }

    getTicketById(id, req) {
        return this.ticketsService.getTicketById(id, req.user);
    }

    claimTicket(id, req) {
        return this.ticketsService.claimTicket(id, req.user);
    }

    assignTicket(id, body, req) {
        return this.ticketsService.assignTicket(
            id,
            body.agent_id,
            req.user
        );
    }

    updateStatus(id, body, req) {
        return this.ticketsService.updateStatus(
            id,
            body.status,
            req.user
        );
    }

    getTicketActivities(id, req) {
        return this.ticketsService.getTicketActivities(
            id,
            req.user
        );
    }

    // Agent requests clarification
    requestClarification(id, req, body) {
        return this.ticketsService.requestClarification(
            id,
            req.user,
            body
        );
    }

    getClarifications(id, req) {
    return this.ticketsService.getClarifications(
        id,
        req.user
    );
}
resumeTicket(id, req) {
    return this.ticketsService.resumeTicket(
        id,
        req.user
    );
}

    // Customer responds to clarification
    respondToClarification(id, clarificationId, req, body) {
        return this.ticketsService.respondToClarification(
            id,
            clarificationId,
            req.user,
            body
        );
    }
}

Inject(TicketsService)(TicketsController, undefined, 0);

Controller('tickets')(TicketsController);
UseGuards(JwtAuthGuard)(TicketsController);

// POST /tickets
Post()(
    TicketsController.prototype,
    'createTicket',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'createTicket'
    )
);
Req()(TicketsController.prototype, 'createTicket', 0);
Body()(TicketsController.prototype, 'createTicket', 1);

// GET /tickets
Get()(
    TicketsController.prototype,
    'getTickets',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'getTickets'
    )
);
Req()(TicketsController.prototype, 'getTickets', 0);

// PATCH /tickets/:id/resume
Patch(':id/resume')(
    TicketsController.prototype,
    'resumeTicket',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'resumeTicket'
    )
);

Param('id', ParseIntPipe)(
    TicketsController.prototype,
    'resumeTicket',
    0
);

Req()(
    TicketsController.prototype,
    'resumeTicket',
    1
);
// GET /tickets/:id
Get(':id')(
    TicketsController.prototype,
    'getTicketById',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'getTicketById'
    )
);
Param('id', ParseIntPipe)(TicketsController.prototype, 'getTicketById', 0);
Req()(TicketsController.prototype, 'getTicketById', 1);

// GET /tickets/:id/activities
Get(':id/activities')(
    TicketsController.prototype,
    'getTicketActivities',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'getTicketActivities'
    )
);
Param('id', ParseIntPipe)(TicketsController.prototype, 'getTicketActivities', 0);
Req()(TicketsController.prototype, 'getTicketActivities', 1);

// POST /tickets/:id/claim
Post(':id/claim')(
    TicketsController.prototype,
    'claimTicket',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'claimTicket'
    )
);
Param('id', ParseIntPipe)(TicketsController.prototype, 'claimTicket', 0);
Req()(TicketsController.prototype, 'claimTicket', 1);

// GET /tickets/:id/clarifications
Get(':id/clarifications')(
    TicketsController.prototype,
    'getClarifications',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'getClarifications'
    )
);

Param('id', ParseIntPipe)(
    TicketsController.prototype,
    'getClarifications',
    0
);

Req()(
    TicketsController.prototype,
    'getClarifications',
    1
);




// POST /tickets/:id/assign
Post(':id/assign')(
    TicketsController.prototype,
    'assignTicket',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'assignTicket'
    )
);
Param('id', ParseIntPipe)(TicketsController.prototype, 'assignTicket', 0);
Body()(TicketsController.prototype, 'assignTicket', 1);
Req()(TicketsController.prototype, 'assignTicket', 2);

// PATCH /tickets/:id/status
Patch(':id/status')(
    TicketsController.prototype,
    'updateStatus',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'updateStatus'
    )
);
Param('id', ParseIntPipe)(TicketsController.prototype, 'updateStatus', 0);
Body()(TicketsController.prototype, 'updateStatus', 1);
Req()(TicketsController.prototype, 'updateStatus', 2);

// POST /tickets/:id/clarifications
Post(':id/clarifications')(
    TicketsController.prototype,
    'requestClarification',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'requestClarification'
    )
);
Param('id', ParseIntPipe)(TicketsController.prototype, 'requestClarification', 0);
Req()(TicketsController.prototype, 'requestClarification', 1);
Body()(TicketsController.prototype, 'requestClarification', 2);

// POST /tickets/:id/clarifications/:clarificationId/respond
Post(':id/clarifications/:clarificationId/respond')(
    TicketsController.prototype,
    'respondToClarification',
    Object.getOwnPropertyDescriptor(
        TicketsController.prototype,
        'respondToClarification'
    )
);
Param('id', ParseIntPipe)(TicketsController.prototype, 'respondToClarification', 0);
Param('clarificationId', ParseIntPipe)(TicketsController.prototype, 'respondToClarification', 1);
Req()(TicketsController.prototype, 'respondToClarification', 2);
Body()(TicketsController.prototype, 'respondToClarification', 3);

module.exports = TicketsController;
