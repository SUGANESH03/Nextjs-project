
const { Module } = require('@nestjs/common');

const DatabaseModule = require('../database/database.module');
const AuthModule = require('../auth/auth.module');
const NotificationsModule = require('../notifications/notifications.module');

const DatabaseService = require('../database/database.service');
const NotificationsService = require('../notifications/notifications.service');

const PresenceService = require('./presence.service');
const PresenceController = require('./presence.controller');

class PresenceModule {}

Module({
    imports: [
        DatabaseModule,
        AuthModule,
        NotificationsModule
    ],

    controllers: [
        PresenceController
    ],

    providers: [
        {
            provide: PresenceService,
            useFactory: (database, notifications) => {
                return new PresenceService(
                    database,
                    notifications
                );
            },
            inject: [
                DatabaseService,
                NotificationsService
            ]
        }
    ],

    exports: [
        PresenceService
    ]
})(PresenceModule);

module.exports = PresenceModule;
