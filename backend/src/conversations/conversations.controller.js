
const {
    Controller,
    Get,
    Post,
    Body,
    Req,
    Param,
    ParseIntPipe,
    UseGuards,
    Inject
} = require('@nestjs/common');

const ConversationsService = require('./conversations.service');
const JwtAuthGuard = require('../auth/jwt-auth.guard');

class ConversationsController {
    constructor(service) {
        this.service = service;
    }

    sendMessage(id, req, body) {
        return this.service.sendMessage(
            id,
            req.user,
            body
        );
    }

    getMessages(id, req) {
        return this.service.getMessages(id, req.user);
    }
}

Inject(ConversationsService)(
    ConversationsController,
    undefined,
    0
);

Controller('tickets/:id/messages')(ConversationsController);
UseGuards(JwtAuthGuard)(ConversationsController);

Post()(
    ConversationsController.prototype,
    'sendMessage',
    Object.getOwnPropertyDescriptor(
        ConversationsController.prototype,
        'sendMessage'
    )
);

Param('id', ParseIntPipe)(
    ConversationsController.prototype,
    'sendMessage',
    0
);
Req()(ConversationsController.prototype, 'sendMessage', 1);
Body()(ConversationsController.prototype, 'sendMessage', 2);

Get()(
    ConversationsController.prototype,
    'getMessages',
    Object.getOwnPropertyDescriptor(
        ConversationsController.prototype,
        'getMessages'
    )
);

Param('id', ParseIntPipe)(
    ConversationsController.prototype,
    'getMessages',
    0
);
Req()(ConversationsController.prototype, 'getMessages', 1);

module.exports = ConversationsController;
