
const { Module } = require('@nestjs/common');

const DatabaseModule = require('../database/database.module');
const AuthModule = require('../auth/auth.module');

const DatabaseService = require('../database/database.service');
const AgentsService = require('./agents.service');
const AgentsController = require('./agents.controller');

class AgentsModule {}

Module({
    imports: [
        DatabaseModule,
        AuthModule
    ],
    controllers: [AgentsController],
    providers: [
        {
            provide: AgentsService,
            useFactory: (database) => {
                return new AgentsService(database);
            },
            inject: [DatabaseService]
        }
    ]
})(AgentsModule);

module.exports = AgentsModule;
