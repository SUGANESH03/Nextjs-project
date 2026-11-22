
const {
    Controller,
    Get,
    Patch,
    Param,
    ParseIntPipe,
    Req,
    UseGuards,
    Inject
} = require('@nestjs/common');

const NotificationsService = require('./notifications.service');
const JwtAuthGuard = require('../auth/jwt-auth.guard');

class NotificationsController {
    constructor(service) {
        this.service = service;
    }

    getNotifications(req) {
        return this.service.getNotifications(req.user);
    }

    getUnreadCount(req) {
        return this.service.getUnreadCount(req.user);
    }

    markAsRead(id, req) {
        return this.service.markAsRead(id, req.user);
    }

    markAllAsRead(req) {
        return this.service.markAllAsRead(req.user);
    }
}

Inject(NotificationsService)(
    NotificationsController,
    undefined,
    0
);

Controller('notifications')(NotificationsController);
UseGuards(JwtAuthGuard)(NotificationsController);

// GET /notifications
Get()(
    NotificationsController.prototype,
    'getNotifications',
    Object.getOwnPropertyDescriptor(
        NotificationsController.prototype,
        'getNotifications'
    )
);
Req()(NotificationsController.prototype, 'getNotifications', 0);

// GET /notifications/unread-count
Get('unread-count')(
    NotificationsController.prototype,
    'getUnreadCount',
    Object.getOwnPropertyDescriptor(
        NotificationsController.prototype,
        'getUnreadCount'
    )
);
Req()(NotificationsController.prototype, 'getUnreadCount', 0);

// PATCH /notifications/read-all
Patch('read-all')(
    NotificationsController.prototype,
    'markAllAsRead',
    Object.getOwnPropertyDescriptor(
        NotificationsController.prototype,
        'markAllAsRead'
    )
);
Req()(NotificationsController.prototype, 'markAllAsRead', 0);

// PATCH /notifications/:id/read
Patch(':id/read')(
    NotificationsController.prototype,
    'markAsRead',
    Object.getOwnPropertyDescriptor(
        NotificationsController.prototype,
        'markAsRead'
    )
);
Param('id', ParseIntPipe)(
    NotificationsController.prototype,
    'markAsRead',
    0
);
Req()(NotificationsController.prototype, 'markAsRead', 1);

module.exports = NotificationsController;
