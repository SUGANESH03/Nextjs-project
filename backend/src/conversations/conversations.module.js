
const { Module } = require('@nestjs/common');

const DatabaseModule = require('../database/database.module');
const AuthModule = require('../auth/auth.module');
const NotificationsModule = require('../notifications/notifications.module');

const DatabaseService = require('../database/database.service');
const NotificationsService = require('../notifications/notifications.service');

const ConversationsService = require('./conversations.service');
const ConversationsController = require('./conversations.controller');

class ConversationsModule {}

Module({
    imports: [
        DatabaseModule,
        AuthModule,
        NotificationsModule
    ],
    controllers: [ConversationsController],
    providers: [
        {
            provide: ConversationsService,
            useFactory: (database, notifications) => {
                return new ConversationsService(
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
})(ConversationsModule);

module.exports = ConversationsModule;
