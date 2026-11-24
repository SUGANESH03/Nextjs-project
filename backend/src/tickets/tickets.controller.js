
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

    getTicketActivities(id, req) {
        return this.ticketsService.getTicketActivities(id, req.user);
    }

    getTicketTimeline(id, req) {
        return this.ticketsService.getTicketTimeline(id, req.user);
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

    resumeTicket(id, req) {
        return this.ticketsService.resumeTicket(id, req.user);
    }
}

Inject(TicketsService)(TicketsController, undefined, 0);

Controller('tickets')(TicketsController);
UseGuards(JwtAuthGuard)(TicketsController);

// POST /api/tickets
Post()(TicketsController.prototype, 'createTicket',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'createTicket'));
Req()(TicketsController.prototype, 'createTicket', 0);
Body()(TicketsController.prototype, 'createTicket', 1);

// GET /api/tickets
Get()(TicketsController.prototype, 'getTickets',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'getTickets'));
Req()(TicketsController.prototype, 'getTickets', 0);

// GET /api/tickets/:id
Get(':id')(TicketsController.prototype, 'getTicketById',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'getTicketById'));
Param('id', ParseIntPipe)(TicketsController.prototype, 'getTicketById', 0);
Req()(TicketsController.prototype, 'getTicketById', 1);

// GET /api/tickets/:id/activities
Get(':id/activities')(TicketsController.prototype, 'getTicketActivities',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'getTicketActivities'));
Param('id', ParseIntPipe)(TicketsController.prototype, 'getTicketActivities', 0);
Req()(TicketsController.prototype, 'getTicketActivities', 1);

// GET /api/tickets/:id/timeline
Get(':id/timeline')(TicketsController.prototype, 'getTicketTimeline',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'getTicketTimeline'));
Param('id', ParseIntPipe)(TicketsController.prototype, 'getTicketTimeline', 0);
Req()(TicketsController.prototype, 'getTicketTimeline', 1);

// POST /api/tickets/:id/claim
Post(':id/claim')(TicketsController.prototype, 'claimTicket',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'claimTicket'));
Param('id', ParseIntPipe)(TicketsController.prototype, 'claimTicket', 0);
Req()(TicketsController.prototype, 'claimTicket', 1);

// POST /api/tickets/:id/assign
Post(':id/assign')(TicketsController.prototype, 'assignTicket',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'assignTicket'));
Param('id', ParseIntPipe)(TicketsController.prototype, 'assignTicket', 0);
Body()(TicketsController.prototype, 'assignTicket', 1);
Req()(TicketsController.prototype, 'assignTicket', 2);

// PATCH /api/tickets/:id/status
Patch(':id/status')(TicketsController.prototype, 'updateStatus',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'updateStatus'));
Param('id', ParseIntPipe)(TicketsController.prototype, 'updateStatus', 0);
Body()(TicketsController.prototype, 'updateStatus', 1);
Req()(TicketsController.prototype, 'updateStatus', 2);

// PATCH /api/tickets/:id/resume
Patch(':id/resume')(TicketsController.prototype, 'resumeTicket',
    Object.getOwnPropertyDescriptor(TicketsController.prototype, 'resumeTicket'));
Param('id', ParseIntPipe)(TicketsController.prototype, 'resumeTicket', 0);
Req()(TicketsController.prototype, 'resumeTicket', 1);

module.exports = TicketsController;
