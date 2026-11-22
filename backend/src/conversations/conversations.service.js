
const {
    Injectable,
    ForbiddenException,
    NotFoundException,
    BadRequestException
} = require('@nestjs/common');

class ConversationsService {
    constructor(database, notifications) {
        this.database = database;
        this.notifications = notifications;
    }

    // ==========================================
    // VERIFY TICKET ACCESS
    // ==========================================

    async verifyTicketAccess(ticketId, user) {
        const tickets = await this.database.query(
            `SELECT *
             FROM tickets
             WHERE ticket_id = ?`,
            [ticketId]
        );

        if (!tickets.length) {
            throw new NotFoundException('Ticket not found');
        }

        const ticket = tickets[0];

        if (user.role === 'customer') {
            if (Number(ticket.customer_id) !== Number(user.sub)) {
                throw new ForbiddenException('Access denied');
            }

            return ticket;
        }

        if (user.role === 'agent') {
            const assigned = await this.database.query(
                `SELECT assignment_id
                 FROM ticket_assignments
                 WHERE ticket_id = ?
                 AND agent_id = ?
                 AND unassigned_at IS NULL`,
                [ticketId, user.sub]
            );

            if (!assigned.length) {
                throw new ForbiddenException(
                    'You are not assigned to this ticket'
                );
            }

            return ticket;
        }

        if (user.role === 'manager') {
            return ticket;
        }

        throw new ForbiddenException('Access denied');
    }

    // ==========================================
    // GET ACTIVE ASSIGNED AGENT
    // ==========================================

    async getAssignedAgents(ticketId) {
        return this.database.query(
            `SELECT agent_id
             FROM ticket_assignments
             WHERE ticket_id = ?
             AND unassigned_at IS NULL`,
            [ticketId]
        );
    }

    // ==========================================
    // NOTIFICATIONS
    // ==========================================

    async notifyMessageRecipients(ticketId, user, messageType) {
        const tickets = await this.database.query(
            `SELECT customer_id
             FROM tickets
             WHERE ticket_id = ?`,
            [ticketId]
        );

        if (!tickets.length) return;

        const customerId = Number(tickets[0].customer_id);

        const assignedAgents =
            await this.getAssignedAgents(ticketId);

        // PRIVATE CHAT:
        // Assigned agent and managers only.

        if (messageType === 'private') {
            if (user.role === 'customer') return;

            for (const agent of assignedAgents) {
                if (Number(agent.agent_id) !== Number(user.sub)) {
                    await this.notifications.createNotification(
                        agent.agent_id,
                        ticketId,
                        'New Private Message',
                        `A private message was added to ticket #${ticketId}.`
                    );
                }
            }

            const managers = await this.database.query(
                `SELECT user_id
                 FROM users
                 WHERE role = 'manager'
                 AND is_active = TRUE`
            );

            for (const manager of managers) {
                if (Number(manager.user_id) !== Number(user.sub)) {
                    await this.notifications.createNotification(
                        manager.user_id,
                        ticketId,
                        'New Private Message',
                        `A private message was added to ticket #${ticketId}.`
                    );
                }
            }

            return;
        }

        // COMMON CHAT:
        // Customer, assigned agent and manager.

        if (user.role === 'customer') {
            for (const agent of assignedAgents) {
                await this.notifications.createNotification(
                    agent.agent_id,
                    ticketId,
                    'New Customer Message',
                    `Customer sent a message on ticket #${ticketId}.`
                );
            }

            const managers = await this.database.query(
                `SELECT user_id
                 FROM users
                 WHERE role = 'manager'
                 AND is_active = TRUE`
            );

            for (const manager of managers) {
                await this.notifications.createNotification(
                    manager.user_id,
                    ticketId,
                    'New Customer Message',
                    `Customer sent a message on ticket #${ticketId}.`
                );
            }

            return;
        }

        // Agent or manager sends common message.
        if (user.role === 'agent' || user.role === 'manager') {
            await this.notifications.createNotification(
                customerId,
                ticketId,
                'New Ticket Message',
                `A support team member replied to ticket #${ticketId}.`
            );

            // Notify the other assigned agent when a manager sends a message.
            if (user.role === 'manager') {
                for (const agent of assignedAgents) {
                    await this.notifications.createNotification(
                        agent.agent_id,
                        ticketId,
                        'New Manager Message',
                        `Manager replied to ticket #${ticketId}.`
                    );
                }
            }
        }
    }

    // ==========================================
    // SEND MESSAGE
    // ==========================================

    async sendMessage(ticketId, user, data) {
        const message = String(data?.message || '').trim();

        const messageType =
            data?.message_type || 'public';

        if (!message) {
            throw new BadRequestException(
                'Message is required'
            );
        }

        if (!['public', 'private'].includes(messageType)) {
            throw new BadRequestException(
                'Invalid message type'
            );
        }

        await this.verifyTicketAccess(ticketId, user);

        if (messageType === 'private') {
            if (!['agent', 'manager'].includes(user.role)) {
                throw new ForbiddenException(
                    'Only agents and managers can send private messages'
                );
            }

            const assignedAgents =
                await this.getAssignedAgents(ticketId);

            if (!assignedAgents.length) {
                throw new BadRequestException(
                    'Private chat requires an assigned agent'
                );
            }

            if (
                user.role === 'agent' &&
                !assignedAgents.some(
                    (agent) =>
                        Number(agent.agent_id) === Number(user.sub)
                )
            ) {
                throw new ForbiddenException(
                    'Only the assigned agent can send private messages'
                );
            }
        }

        const result = await this.database.query(
            `INSERT INTO conversations
             (
                ticket_id,
                sender_id,
                message,
                message_type
             )
             VALUES (?, ?, ?, ?)`,
            [
                ticketId,
                user.sub,
                message,
                messageType
            ]
        );

        await this.notifyMessageRecipients(
            ticketId,
            user,
            messageType
        );

        return {
            message: 'Message sent successfully',
            message_id: result.insertId,
            message_type: messageType
        };
    }

    // ==========================================
    // GET MESSAGES
    // ==========================================

    async getMessages(ticketId, user) {
        await this.verifyTicketAccess(ticketId, user);

        const commonSelect = `
            SELECT
                c.message_id,
                c.ticket_id,
                c.sender_id,
                c.message,
                c.message_type,
                c.created_at,
                u.full_name,
                u.role
            FROM conversations c
            JOIN users u
                ON c.sender_id = u.user_id
        `;

        // CUSTOMER:
        // Only common messages.

        if (user.role === 'customer') {
            return this.database.query(
                `${commonSelect}
                 WHERE c.ticket_id = ?
                 AND c.message_type = 'public'
                 ORDER BY c.created_at ASC`,
                [ticketId]
            );
        }

        // AGENT:
        // Common messages and private messages
        // from this agent or managers.

        if (user.role === 'agent') {
            return this.database.query(
                `${commonSelect}
                 WHERE c.ticket_id = ?
                 AND (
                    c.message_type = 'public'
                    OR (
                        c.message_type = 'private'
                        AND (
                            c.sender_id = ?
                            OR c.sender_id IN (
                                SELECT user_id
                                FROM users
                                WHERE role = 'manager'
                            )
                        )
                    )
                 )
                 ORDER BY c.created_at ASC`,
                [ticketId, user.sub]
            );
        }

        // MANAGER:
        // All messages for the ticket.

        if (user.role === 'manager') {
            return this.database.query(
                `${commonSelect}
                 WHERE c.ticket_id = ?
                 ORDER BY c.created_at ASC`,
                [ticketId]
            );
        }

        throw new ForbiddenException('Access denied');
    }
}

Injectable()(ConversationsService);

module.exports = ConversationsService;
