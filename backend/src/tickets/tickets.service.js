
const {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    ConflictException
} = require('@nestjs/common');

class TicketsService {
    constructor(database, notifications, activities) {
        this.database = database;
        this.notifications = notifications;
        this.activities = activities;
    }

    // ==========================================
    // ACTIVITY LOG HELPER
    // ==========================================

    async logActivity(
        ticketId,
        userId,
        activityType,
        oldValue = null,
        newValue = null,
        description = null
    ) {
        return this.activities.logActivity({
            ticketId,
            userId,
            activityType,
            oldValue,
            newValue,
            description
        });
    }

    // ==========================================
    // NOTIFY MANAGERS
    // ==========================================

    async notifyManagers(ticketId, title, message) {
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
                title,
                message
            );
        }
    }

    // ==========================================
    // NOTIFY CUSTOMER
    // ==========================================

    async notifyCustomer(ticketId, title, message) {
        const tickets = await this.database.query(
            `SELECT customer_id
             FROM tickets
             WHERE ticket_id = ?`,
            [ticketId]
        );

        if (tickets.length) {
            await this.notifications.createNotification(
                tickets[0].customer_id,
                ticketId,
                title,
                message
            );
        }
    }

    // ==========================================
    // CREATE TICKET - CUSTOMER
    // ==========================================

    async createTicket(user, data) {
        const {
            subject,
            description,
            category,
            priority
        } = data;

        if (
            !subject ||
            !description ||
            !subject.trim() ||
            !description.trim()
        ) {
            throw new BadRequestException(
                'Subject and description are required'
            );
        }

        if (user.role !== 'customer') {
            throw new ForbiddenException(
                'Only customers can create tickets'
            );
        }

        const priorities = [
            'Low',
            'Medium',
            'High',
            'Critical'
        ];

        const selectedPriority = priority || 'Medium';

        if (!priorities.includes(selectedPriority)) {
            throw new BadRequestException('Invalid priority');
        }

        const result = await this.database.query(
            `INSERT INTO tickets
            (
                customer_id,
                subject,
                description,
                category,
                priority
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                user.sub,
                subject.trim(),
                description.trim(),
                category || null,
                selectedPriority
            ]
        );

        const ticketId = result.insertId;

        await this.logActivity(
            ticketId,
            user.sub,
            'CREATED',
            null,
            'Open',
            `Ticket "${subject.trim()}" was created.`
        );

        await this.notifyManagers(
            ticketId,
            'New Ticket Created',
            `A new ticket "${subject.trim()}" has been created.`
        );

        return {
            message: 'Ticket created successfully',
            ticket_id: ticketId
        };
    }

    // ==========================================
    // GET TICKETS - ROLE BASED
    // ==========================================

    async getTickets(user) {
        if (user.role === 'customer') {
            return this.database.query(
                `SELECT *
                 FROM tickets
                 WHERE customer_id = ?
                 ORDER BY created_at DESC`,
                [user.sub]
            );
        }

        if (user.role === 'agent') {
            return this.database.query(
                `SELECT DISTINCT t.*
                 FROM tickets t
                 LEFT JOIN ticket_assignments ta
                    ON t.ticket_id = ta.ticket_id
                    AND ta.unassigned_at IS NULL
                 WHERE
                    ta.agent_id = ?
                    OR (
                        ta.assignment_id IS NULL
                        AND t.status IN ('Open', 'Reopened')
                    )
                 ORDER BY t.created_at DESC`,
                [user.sub]
            );
        }

        if (user.role === 'manager') {
            return this.database.query(
                `SELECT *
                 FROM tickets
                 ORDER BY created_at DESC`
            );
        }

        throw new ForbiddenException('Access denied');
    }

    // ==========================================
    // GET TICKET BY ID
    // ==========================================

    async getTicketById(id, user) {
        const tickets = await this.database.query(
            `SELECT *
             FROM tickets
             WHERE ticket_id = ?`,
            [id]
        );

        if (!tickets.length) {
            throw new NotFoundException('Ticket not found');
        }

        const ticket = tickets[0];

        if (
            user.role === 'customer' &&
            Number(ticket.customer_id) !== Number(user.sub)
        ) {
            throw new ForbiddenException('Access denied');
        }

        if (user.role === 'agent') {
            const assignments = await this.database.query(
                `SELECT assignment_id
                 FROM ticket_assignments
                 WHERE ticket_id = ?
                 AND agent_id = ?
                 AND unassigned_at IS NULL`,
                [id, user.sub]
            );

            if (!assignments.length) {
                throw new ForbiddenException(
                    'Ticket is not assigned to you'
                );
            }
        }

        if (
            !['customer', 'agent', 'manager'].includes(user.role)
        ) {
            throw new ForbiddenException('Access denied');
        }

        return ticket;
    }

    // ==========================================
    // GET TICKET ACTIVITIES
    // ==========================================

    async getTicketActivities(ticketId, user) {
        await this.getTicketById(ticketId, user);

        return this.activities.getActivities(ticketId);
    }

    // ==========================================
    // GET COMPLETE TICKET TIMELINE
    // ==========================================

    async getTicketTimeline(ticketId, user) {

        // Verify ticket access first.
        await this.getTicketById(ticketId, user);

        // 1. Get ticket activities.
        const activities =
            await this.activities.getActivities(ticketId);

        // 2. Get conversations according to user role.
        let messages = [];

        const commonQuery = `
            SELECT
                c.message_id,
                c.ticket_id,
                c.sender_id AS user_id,
                u.full_name,
                u.role,
                c.message,
                c.message_type,
                c.created_at
            FROM conversations c
            INNER JOIN users u
                ON c.sender_id = u.user_id
            WHERE c.ticket_id = ?
        `;

        if (user.role === 'customer') {
            messages = await this.database.query(
                `${commonQuery}
                 AND c.message_type = 'public'
                 ORDER BY c.created_at ASC`,
                [ticketId]
            );
        } else if (user.role === 'agent') {
            messages = await this.database.query(
                `${commonQuery}
                 AND (
                    c.message_type = 'public'
                    OR (
                        c.message_type = 'private'
                        AND (
                            c.sender_id = ?
                            OR u.role = 'manager'
                        )
                    )
                 )
                 ORDER BY c.created_at ASC`,
                [ticketId, user.sub]
            );
        } else if (user.role === 'manager') {
            messages = await this.database.query(
                `${commonQuery}
                 ORDER BY c.created_at ASC`,
                [ticketId]
            );
        }

        // 3. Convert activities into timeline events.
        const activityEvents = activities.map((activity) => ({
            id: `activity-${activity.activity_id}`,
            event_type: 'activity',
            activity_type: activity.activity_type,
            user_id: activity.user_id,
            full_name: activity.full_name,
            role: activity.role,
            old_value: activity.old_value,
            new_value: activity.new_value,
            description: activity.description,
            created_at: activity.created_at
        }));

        // 4. Convert messages into timeline events.
        const messageEvents = messages.map((message) => ({
            id: `message-${message.message_id}`,
            event_type: 'message',
            user_id: message.user_id,
            full_name: message.full_name,
            role: message.role,
            message: message.message,
            message_type: message.message_type,
            created_at: message.created_at
        }));

        // 5. Combine and sort chronologically.
        const timeline = [
            ...activityEvents,
            ...messageEvents
        ];

        timeline.sort(
            (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
        );

        return {
            ticket_id: Number(ticketId),
            total_events: timeline.length,
            timeline
        };
    }

    // ==========================================
    // CLAIM TICKET - AGENT
    // ==========================================

    async claimTicket(id, user) {
        if (user.role !== 'agent') {
            throw new ForbiddenException(
                'Only agents can claim tickets'
            );
        }

        const tickets = await this.database.query(
            `SELECT ticket_id, status
             FROM tickets
             WHERE ticket_id = ?`,
            [id]
        );

        if (!tickets.length) {
            throw new NotFoundException('Ticket not found');
        }

        const oldStatus = tickets[0].status;

        if (!['Open', 'Reopened'].includes(oldStatus)) {
            throw new ConflictException(
                'This ticket cannot be claimed'
            );
        }

        const existing = await this.database.query(
            `SELECT assignment_id
             FROM ticket_assignments
             WHERE ticket_id = ?
             AND unassigned_at IS NULL`,
            [id]
        );

        if (existing.length) {
            throw new ConflictException(
                'Ticket is already assigned'
            );
        }

        await this.database.query(
            `INSERT INTO ticket_assignments
            (
                ticket_id,
                agent_id,
                assigned_by
            )
            VALUES (?, ?, ?)`,
            [id, user.sub, user.sub]
        );

        await this.database.query(
            `UPDATE tickets
             SET status = 'In Progress',
                 previous_status = NULL
             WHERE ticket_id = ?`,
            [id]
        );

        await this.logActivity(
            id,
            user.sub,
            'CLAIMED',
            null,
            user.sub,
            `Agent #${user.sub} claimed the ticket.`
        );

        await this.logActivity(
            id,
            user.sub,
            'STATUS_CHANGED',
            oldStatus,
            'In Progress',
            `Ticket status changed from ${oldStatus} to In Progress.`
        );

        await this.notifyCustomer(
            id,
            'Ticket Assigned',
            'An agent has claimed your ticket and will work on it.'
        );

        await this.notifyManagers(
            id,
            'Ticket Claimed',
            `Agent #${user.sub} has claimed ticket #${id}.`
        );

        return {
            message: 'Ticket claimed successfully',
            ticket_id: Number(id)
        };
    }

    // ==========================================
    // ASSIGN TICKET - MANAGER
    // ==========================================

    async assignTicket(id, agentId, user) {
        if (user.role !== 'manager') {
            throw new ForbiddenException(
                'Only managers can assign tickets'
            );
        }

        if (
            !agentId ||
            !Number.isInteger(Number(agentId)) ||
            Number(agentId) <= 0
        ) {
            throw new BadRequestException(
                'Valid agent ID is required'
            );
        }

        const tickets = await this.database.query(
            `SELECT ticket_id, status
             FROM tickets
             WHERE ticket_id = ?`,
            [id]
        );

        if (!tickets.length) {
            throw new NotFoundException('Ticket not found');
        }

        const oldStatus = tickets[0].status;

        if (['Resolved', 'Closed'].includes(oldStatus)) {
            throw new ConflictException(
                'Resolved or closed tickets cannot be assigned'
            );
        }

        const agents = await this.database.query(
            `SELECT user_id
             FROM users
             WHERE user_id = ?
             AND role = 'agent'
             AND is_active = TRUE`,
            [agentId]
        );

        if (!agents.length) {
            throw new NotFoundException('Active agent not found');
        }

        const existingAssignments = await this.database.query(
            `SELECT agent_id
             FROM ticket_assignments
             WHERE ticket_id = ?
             AND unassigned_at IS NULL`,
            [id]
        );

        const previousAgent = existingAssignments.length
            ? existingAssignments[0].agent_id
            : null;

        await this.database.query(
            `UPDATE ticket_assignments
             SET unassigned_at = CURRENT_TIMESTAMP
             WHERE ticket_id = ?
             AND unassigned_at IS NULL`,
            [id]
        );

        await this.database.query(
            `INSERT INTO ticket_assignments
            (
                ticket_id,
                agent_id,
                assigned_by
            )
            VALUES (?, ?, ?)`,
            [id, Number(agentId), user.sub]
        );

        await this.database.query(
            `UPDATE tickets
             SET status = 'In Progress',
                 previous_status = NULL
             WHERE ticket_id = ?`,
            [id]
        );

        const activityType = previousAgent
            ? 'REASSIGNED'
            : 'ASSIGNED';

        await this.logActivity(
            id,
            user.sub,
            activityType,
            previousAgent ? String(previousAgent) : null,
            String(agentId),
            previousAgent
                ? `Ticket reassigned from agent #${previousAgent} to agent #${agentId}.`
                : `Ticket assigned to agent #${agentId}.`
        );

        if (oldStatus !== 'In Progress') {
            await this.logActivity(
                id,
                user.sub,
                'STATUS_CHANGED',
                oldStatus,
                'In Progress',
                `Ticket status changed from ${oldStatus} to In Progress.`
            );
        }

        await this.notifications.createNotification(
            Number(agentId),
            id,
            'New Ticket Assigned',
            `You have been assigned ticket #${id}.`
        );

        await this.notifyCustomer(
            id,
            'Ticket Assigned',
            `Your ticket #${id} has been assigned to an agent.`
        );

        return {
            message: 'Ticket assigned successfully',
            ticket_id: Number(id),
            agent_id: Number(agentId)
        };
    }

    // ==========================================
    // RESUME TICKET - MANAGER ONLY
    // ==========================================

    async resumeTicket(ticketId, user) {
        if (user.role !== 'manager') {
            throw new ForbiddenException(
                'Only managers can resume tickets'
            );
        }

        const tickets = await this.database.query(
            `SELECT ticket_id, status, previous_status
             FROM tickets
             WHERE ticket_id = ?`,
            [ticketId]
        );

        if (!tickets.length) {
            throw new NotFoundException('Ticket not found');
        }

        const ticket = tickets[0];
        const oldStatus = ticket.status;

        if (oldStatus !== 'On Hold') {
            throw new ConflictException(
                'Only On Hold tickets can be resumed'
            );
        }

        const restoredStatus = ticket.previous_status || 'In Progress';

        await this.database.query(
            `UPDATE tickets
             SET status = ?,
                 previous_status = NULL,
                 resolved_at = CASE
                    WHEN ? = 'Resolved' THEN CURRENT_TIMESTAMP
                    ELSE NULL
                 END
             WHERE ticket_id = ?`,
            [restoredStatus, restoredStatus, ticketId]
        );

        await this.logActivity(
            ticketId,
            user.sub,
            'STATUS_CHANGED',
            'On Hold',
            restoredStatus,
            `Manager resumed the ticket. Status restored to ${restoredStatus}.`
        );

        await this.notifyCustomer(
            ticketId,
            'Ticket Resumed',
            `Your ticket #${ticketId} has been resumed.`
        );

        const assignments = await this.database.query(
            `SELECT agent_id
             FROM ticket_assignments
             WHERE ticket_id = ?
             AND unassigned_at IS NULL`,
            [ticketId]
        );

        for (const assignment of assignments) {
            await this.notifications.createNotification(
                assignment.agent_id,
                ticketId,
                'Ticket Resumed',
                `Manager resumed ticket #${ticketId}. You can continue working on it.`
            );
        }

        return {
            message: 'Ticket resumed successfully',
            ticket_id: Number(ticketId),
            old_status: oldStatus,
            status: restoredStatus
        };
    }

    // ==========================================
    // UPDATE STATUS - AGENT / MANAGER
    // ==========================================

    async updateStatus(id, status, user) {
        const allowedStatuses = [
            'Open',
            'In Progress',
            'On Hold',
            'Pending',
            'Resolved',
            'Closed',
            'Reopened'
        ];

        if (!allowedStatuses.includes(status)) {
            throw new BadRequestException(
                'Invalid ticket status'
            );
        }

        const tickets = await this.database.query(
            `SELECT ticket_id, status
             FROM tickets
             WHERE ticket_id = ?`,
            [id]
        );

        if (!tickets.length) {
            throw new NotFoundException('Ticket not found');
        }

        const oldStatus = tickets[0].status;

        if (user.role === 'agent') {
            const assignments = await this.database.query(
                `SELECT assignment_id
                 FROM ticket_assignments
                 WHERE ticket_id = ?
                 AND agent_id = ?
                 AND unassigned_at IS NULL`,
                [id, user.sub]
            );

            if (!assignments.length) {
                throw new ForbiddenException(
                    'You are not assigned to this ticket'
                );
            }
        } else if (user.role !== 'manager') {
            throw new ForbiddenException(
                'Only assigned agents and managers can update status'
            );
        }

        await this.database.query(
            `UPDATE tickets
             SET previous_status = CASE
                    WHEN ? = 'On Hold' AND ? <> 'On Hold'
                        THEN ?
                    WHEN ? <> 'On Hold'
                        THEN NULL
                    ELSE previous_status
                 END,
                 status = ?,
                 resolved_at = CASE
                    WHEN ? = 'Resolved' THEN CURRENT_TIMESTAMP
                    WHEN ? IN ('Open', 'In Progress', 'On Hold', 'Reopened')
                        THEN NULL
                    ELSE resolved_at
                 END
             WHERE ticket_id = ?`,
            [
                status,
                oldStatus,
                oldStatus,
                status,
                status,
                status,
                status,
                id
            ]
        );

        if (oldStatus !== status) {
            let activityType = 'STATUS_CHANGED';

            if (status === 'On Hold') {
                activityType = 'ON_HOLD';
            } else if (status === 'Resolved') {
                activityType = 'RESOLVED';
            } else if (status === 'Closed') {
                activityType = 'CLOSED';
            }

            await this.logActivity(
                id,
                user.sub,
                activityType,
                oldStatus,
                status,
                `Ticket status changed from ${oldStatus} to ${status}.`
            );

            await this.notifyCustomer(
                id,
                'Ticket Status Updated',
                `Your ticket #${id} status has changed to ${status}.`
            );

            if (status === 'On Hold') {
                await this.notifyManagers(
                    id,
                    'Ticket On Hold',
                    `Ticket #${id} has been placed On Hold.`
                );
            }
        }

        return {
            message: 'Ticket status updated successfully',
            ticket_id: Number(id),
            old_status: oldStatus,
            status
        };
    }
}

Injectable()(TicketsService);

module.exports = TicketsService;
