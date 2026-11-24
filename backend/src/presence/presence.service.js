
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

    // ==========================================
    // CUSTOMER RETURNS ONLINE
    // RESTORE TICKETS AND SEND NOTIFICATIONS
    // ==========================================

    async handleCustomerOnline(customerId) {

        // 1. Find customer's On Hold tickets.
        const heldTickets = await this.database.query(
            `SELECT ticket_id, previous_status
             FROM tickets
             WHERE customer_id = ?
             AND status = 'On Hold'
             AND previous_status IS NOT NULL`,
            [customerId]
        );

        const restoredTicketIds = [];

        // 2. Restore each ticket to its previous status.
        for (const ticket of heldTickets) {
            const result = await this.database.query(
                `UPDATE tickets
                 SET status = previous_status,
                     previous_status = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE ticket_id = ?
                 AND customer_id = ?
                 AND status = 'On Hold'
                 AND previous_status IS NOT NULL`,
                [ticket.ticket_id, customerId]
            );

            if (!result.affectedRows) {
                continue;
            }

            restoredTicketIds.push(ticket.ticket_id);

            // Record ticket activity.
            await this.database.query(
                `INSERT INTO ticket_activities
                 (ticket_id, user_id, activity_type, old_value, new_value, description)
                 VALUES (?, ?, 'STATUS_CHANGED', ?, ?, ?)`,
                [
                    ticket.ticket_id,
                    customerId,
                    'On Hold',
                    ticket.previous_status,
                    `Ticket automatically resumed when customer came online.`
                ]
            );

            // Notify customer about ticket restoration.
            await this.notifications.createNotification(
                customerId,
                ticket.ticket_id,
                'Ticket Resumed',
                `Your ticket #${ticket.ticket_id} has automatically resumed.`
            );
        }

        // 3. Get all active tickets belonging to customer.
        const activeTickets = await this.database.query(
            `SELECT ticket_id
             FROM tickets
             WHERE customer_id = ?
             AND status NOT IN ('Resolved', 'Closed')`,
            [customerId]
        );

        // 4. Get all active managers.
        const managers = await this.database.query(
            `SELECT user_id
             FROM users
             WHERE role = 'manager'
             AND is_active = TRUE`,
        );

        // 5. Notify managers even when there are no active tickets.
        if (!activeTickets.length) {
            for (const manager of managers) {
                await this.notifications.createNotification(
                    manager.user_id,
                    null,
                    'Customer Back Online',
                    `Customer #${customerId} is now online.`
                );
            }

            return {
                restored_count: restoredTicketIds.length
            };
        }

        // 6. Notify assigned agents and managers for each active ticket.
        for (const ticket of activeTickets) {
            const ticketId = ticket.ticket_id;

            const agents = await this.database.query(
                `SELECT DISTINCT agent_id
                 FROM ticket_assignments
                 WHERE ticket_id = ?
                 AND unassigned_at IS NULL`,
                [ticketId]
            );

            const message =
                `Customer #${customerId} is back online for ticket #${ticketId}.`;

            // Notify assigned agents.
            for (const agent of agents) {
                await this.notifications.createNotification(
                    agent.agent_id,
                    ticketId,
                    'Customer Back Online',
                    message
                );
            }

            // Notify managers.
            for (const manager of managers) {
                await this.notifications.createNotification(
                    manager.user_id,
                    ticketId,
                    'Customer Back Online',
                    message
                );
            }
        }

        return {
            restored_count: restoredTicketIds.length
        };
    }

    // ==========================================
    // MARK USER ONLINE
    // ==========================================

    async markOnline(user) {
        const users = await this.database.query(
            `SELECT user_id, role, presence_status
             FROM users
             WHERE user_id = ?
             AND is_active = TRUE`,
            [user.sub]
        );

        if (!users.length) {
            throw new NotFoundException('User not found');
        }

        const currentUser = users[0];

        // Detect genuine Offline -> Online transition.
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

        // Already online: refresh heartbeat only.
        if (!transition.affectedRows) {
            await this.database.query(
                `UPDATE users
                 SET last_seen_at = CURRENT_TIMESTAMP
                 WHERE user_id = ?`,
                [user.sub]
            );

            return {
                message: 'Presence refreshed',
                presence_status: 'Online'
            };
        }

        // Run customer return workflow only once.
        if (currentUser.role === 'customer') {
            const result = await this.handleCustomerOnline(user.sub);

            return {
                message: 'You are now online',
                presence_status: 'Online',
                restored_tickets: result.restored_count
            };
        }

        return {
            message: 'You are now online',
            presence_status: 'Online'
        };
    }

    // ==========================================
    // SET ONLINE
    // ==========================================

    async setOnline(user) {
        return this.markOnline(user);
    }

    // ==========================================
    // SET OFFLINE
    // ==========================================

    // ==========================================
// SET OFFLINE + NOTIFY ALL MANAGERS
// ==========================================

async setOffline(user) {
    const result = await this.database.query(
        `UPDATE users
         SET presence_status = 'Offline',
             last_seen_at = CURRENT_TIMESTAMP
         WHERE user_id = ?
         AND is_active = TRUE
         AND presence_status = 'Online'`,
        [user.sub]
    );

    if (!result.affectedRows) {
        return {
            message: 'User is already offline',
            presence_status: 'Offline'
        };
    }

    // Get user details
    const users = await this.database.query(
        `SELECT full_name, role
         FROM users
         WHERE user_id = ?`,
        [user.sub]
    );

    const currentUser = users[0];

    // Notify managers only when a customer goes offline
    if (currentUser?.role === 'customer') {
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
                'Customer Offline',
                `Customer ${currentUser.full_name} (ID: ${user.sub}) is now offline.`
            );
        }
    }

    return {
        message: 'You are now offline',
        presence_status: 'Offline'
    };
}
    // ==========================================
    // HEARTBEAT
    // ==========================================

    async heartbeat(user) {
        await this.markOnline(user);

        return {
            message: 'Heartbeat received',
            presence_status: 'Online',
            last_seen_at: new Date()
        };
    }

    // ==========================================
    // GET PRESENCE
    // ==========================================

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
