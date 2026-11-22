
const { Module } = require('@nestjs/common');

const DatabaseModule = require('./database/database.module');
const AuthModule = require('./auth/auth.module');
const AgentsModule = require('./agents/agents.module');
const TicketsModule = require('./tickets/tickets.module');
const ConversationsModule = require('./conversations/conversations.module');
const NotificationsModule = require('./notifications/notifications.module');
const ReopenRequestsModule = require('./reopen-requests/reopen-requests.module');
const PresenceModule = require('./presence/presence.module');

class AppModule {}

Module({
    imports: [
        DatabaseModule,
        AuthModule,
        AgentsModule,
        TicketsModule,
        ConversationsModule,
        NotificationsModule,
        ReopenRequestsModule,
        PresenceModule
    ]
})(AppModule);

module.exports = AppModule;
