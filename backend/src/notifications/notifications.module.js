
const { Module } = require('@nestjs/common');

const DatabaseModule = require('../database/database.module');
const AuthModule = require('../auth/auth.module');

const DatabaseService = require('../database/database.service');
const NotificationsService = require('./notifications.service');
const NotificationsController = require('./notifications.controller');

class NotificationsModule {}

Module({
    imports: [
        DatabaseModule,
        AuthModule
    ],
    controllers: [NotificationsController],
    providers: [
        {
            provide: NotificationsService,
            useFactory: (database) => {
                return new NotificationsService(database);
            },
            inject: [DatabaseService]
        }
    ],
    exports: [NotificationsService]
})(NotificationsModule);

module.exports = NotificationsModule;
