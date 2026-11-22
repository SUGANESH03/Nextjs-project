
const {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Inject
} = require('@nestjs/common');

const AgentsService = require('./agents.service');
const JwtAuthGuard = require('../auth/jwt-auth.guard');
const RolesGuard = require('../auth/roles.guard');
const Roles = require('../auth/roles.decorator');

class AgentsController {
    constructor(agentsService) {
        this.agentsService = agentsService;
    }

    createAgent(body) {
        return this.agentsService.createAgent(body);
    }

    getAgents() {
        return this.agentsService.getAgents();
    }
}

Inject(AgentsService)(AgentsController, undefined, 0);

Controller('agents')(AgentsController);

UseGuards(JwtAuthGuard, RolesGuard)(AgentsController);
Roles('manager')(AgentsController);

Post()(
    AgentsController.prototype,
    'createAgent',
    Object.getOwnPropertyDescriptor(AgentsController.prototype, 'createAgent')
);
Body()(AgentsController.prototype, 'createAgent', 0);

Get()(
    AgentsController.prototype,
    'getAgents',
    Object.getOwnPropertyDescriptor(AgentsController.prototype, 'getAgents')
);

module.exports = AgentsController;
