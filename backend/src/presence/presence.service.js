
const {
    Injectable,
    ForbiddenException,
    NotFoundException
} = require('@nestjs/common');

class PresenceService {
    constructor(database, notifications) {
        this.database = database;
        this.notifications = notifications;
    }

    // Notify managers when a customer returns online
    async notifyManagersCustomerOnline(customerId) {
        const managers = await this.database.query(
            `SELECT user_id
             FROM users
             WHERE role = 'manager'
             AND is_active = TRUE`
        );

        for (const manager of managers) {
            await this.notifications.createNotification(
                manager.user_id,
                null,
                'Customer Back Online',
                `Customer #${customerId} is now online and may respond to pending tickets.`
            );
        }
    }

    // Mark user online and detect an Offline -> Online transition
    async markOnline(user) {
        const users = await this.database.query(
            `SELECT user_id, role
             FROM users
             WHERE user_id = ?
             AND is_active = TRUE`,
            [user.sub]
        );

        if (!users.length) {
            throw new NotFoundException('User not found');
        }

        // Only a genuine transition from Offline to Online
        // should trigger a manager notification.
        const transition = await this.database.query(
            `UPDATE users
             SET presence_status = 'Online',
                 last_seen_at = CURRENT_TIMESTAMP
             WHERE user_id = ?
             AND (
                presence_status IS NULL
                OR presence_status <> 'Online'
             )`,
            [user.sub]
        );

        // If already online, just refresh last_seen_at.
        if (!transition.affectedRows) {
            await this.database.query(
                `UPDATE users
                 SET last_seen_at = CURRENT_TIMESTAMP
                 WHERE user_id = ?`,
                [user.sub]
            );
        }

        // Only customer returning online notifies managers.
        if (
            transition.affectedRows > 0 &&
            users[0].role === 'customer'
        ) {
            await this.notifyManagersCustomerOnline(user.sub);
        }

        return {
            message: 'You are now online',
            presence_status: 'Online'
        };
    }

    // Update user as online
    async setOnline(user) {
        return this.markOnline(user);
    }

    // Update user as offline
    async setOffline(user) {
        const result = await this.database.query(
            `UPDATE users
             SET presence_status = 'Offline',
                 last_seen_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [user.sub]
        );

        if (!result.affectedRows) {
            throw new NotFoundException('User not found');
        }

        return {
            message: 'You are now offline',
            presence_status: 'Offline'
        };
    }

    // Heartbeat: refresh last seen and detect return online
    async heartbeat(user) {
        await this.markOnline(user);

        return {
            presence_status: 'Online',
            last_seen_at: new Date()
        };
    }

    // Get presence of users
    async getPresence(user) {
        if (!['manager', 'agent'].includes(user.role)) {
            throw new ForbiddenException('Access denied');
        }

        return this.database.query(
            `SELECT
                user_id,
                full_name,
                role,
                presence_status,
                last_seen_at
             FROM users
             WHERE is_active = TRUE
             ORDER BY role, full_name`
        );
    }
}

Injectable()(PresenceService);

module.exports = PresenceService;
