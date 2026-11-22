
const { Module } = require('@nestjs/common');

const DatabaseModule = require('../database/database.module');
const AuthModule = require('../auth/auth.module');

const DatabaseService = require('../database/database.service');
const NotificationsModule = require('../notifications/notifications.module');
const NotificationsService = require('../notifications/notifications.service');

const ReopenRequestsService = require('./reopen-requests.service');
const ReopenRequestsController = require('./reopen-requests.controller');

class ReopenRequestsModule {}

Module({
    imports: [
        DatabaseModule,
        AuthModule,
        NotificationsModule
    ],
    controllers: [ReopenRequestsController],
    providers: [
        {
            provide: ReopenRequestsService,
            useFactory: (database, notifications) => {
                return new ReopenRequestsService(
                    database,
                    notifications
                );
            },
            inject: [
                DatabaseService,
                NotificationsService
            ]
        }
    ]
})(ReopenRequestsModule);

module.exports = ReopenRequestsModule;
