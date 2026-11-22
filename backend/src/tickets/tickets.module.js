
const { Module } = require('@nestjs/common');

const DatabaseModule = require('../database/database.module');
const AuthModule = require('../auth/auth.module');
const NotificationsModule = require('../notifications/notifications.module');

const DatabaseService = require('../database/database.service');
const NotificationsService = require('../notifications/notifications.service');

const TicketsService = require('./tickets.service');
const TicketsController = require('./tickets.controller');
const TicketActivitiesService = require('./ticket-activities.service');

class TicketsModule {}

Module({
    imports: [
        DatabaseModule,
        AuthModule,
        NotificationsModule
    ],

    controllers: [
        TicketsController
    ],

    providers: [
        {
            provide: TicketActivitiesService,
            useFactory: (database) => {
                return new TicketActivitiesService(database);
            },
            inject: [
                DatabaseService
            ]
        },

        {
            provide: TicketsService,
            useFactory: (database, notifications, activities) => {
                return new TicketsService(
                    database,
                    notifications,
                    activities
                );
            },
            inject: [
                DatabaseService,
                NotificationsService,
                TicketActivitiesService
            ]
        }
    ],

    exports: [
        TicketsService,
        TicketActivitiesService
    ]
})(TicketsModule);

module.exports = TicketsModule;
