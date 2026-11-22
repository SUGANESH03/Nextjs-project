
const {
    Injectable,
    NotFoundException,
    ForbiddenException
} = require('@nestjs/common');

class NotificationsService {
    constructor(database) {
        this.database = database;
    }

    // Create notification
    async createNotification(userId, ticketId, title, message) {
        return this.database.query(
            `INSERT INTO notifications
            (user_id, ticket_id, title, message)
            VALUES (?, ?, ?, ?)`,
            [userId, ticketId || null, title, message]
        );
    }

    // Get logged-in user's notifications
    async getNotifications(user) {
        return this.database.query(
            `SELECT *
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [user.sub]
        );
    }

    // Get unread notification count
    async getUnreadCount(user) {
        const result = await this.database.query(
            `SELECT COUNT(*) AS unread_count
             FROM notifications
             WHERE user_id = ?
             AND is_read = FALSE`,
            [user.sub]
        );

        return result[0];
    }

    // Mark notification as read
    async markAsRead(id, user) {
        const result = await this.database.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE notification_id = ?
             AND user_id = ?`,
            [id, user.sub]
        );

        if (!result.affectedRows) {
            throw new NotFoundException(
                'Notification not found'
            );
        }

        return {
            message: 'Notification marked as read'
        };
    }

    // Mark all notifications as read
    async markAllAsRead(user) {
        await this.database.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE user_id = ?
             AND is_read = FALSE`,
            [user.sub]
        );

        return {
            message: 'All notifications marked as read'
        };
    }
}

Injectable()(NotificationsService);

module.exports = NotificationsService;
