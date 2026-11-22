
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
        // CUSTOMER: Only their own tickets

        if (user.role === 'customer') {
            return this.database.query(
                `SELECT *
                 FROM tickets
                 WHERE customer_id = ?
                 ORDER BY created_at DESC`,
                [user.sub]
            );
        }

        // AGENT: Assigned tickets and unassigned
        // Open/Reopened tickets

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

        // MANAGER: All tickets

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

        // Customer access validation

        if (
            user.role === 'customer' &&
            Number(ticket.customer_id) !== Number(user.sub)
        ) {
            throw new ForbiddenException('Access denied');
        }

        // Agent access validation

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
        // Validate ticket access first

        await this.getTicketById(ticketId, user);

        return this.activities.getActivities(ticketId);
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
             SET status = 'In Progress'
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

        // Get existing active assignment

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

        // Close previous active assignments

        await this.database.query(
            `UPDATE ticket_assignments
             SET unassigned_at = CURRENT_TIMESTAMP
             WHERE ticket_id = ?
             AND unassigned_at IS NULL`,
            [id]
        );

        // Create new assignment

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
             SET status = 'In Progress'
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
    // REQUEST CLARIFICATION - ASSIGNED AGENT
    // ==========================================

    async requestClarification(ticketId, user, data) {
        if (user.role !== 'agent') {
            throw new ForbiddenException(
                'Only agents can request clarification'
            );
        }

        const question = String(data.question || '').trim();

        if (!question) {
            throw new BadRequestException(
                'Clarification question is required'
            );
        }

        const tickets = await this.database.query(
            `SELECT ticket_id, customer_id, status
             FROM tickets
             WHERE ticket_id = ?`,
            [ticketId]
        );

        if (!tickets.length) {
            throw new NotFoundException('Ticket not found');
        }

        const ticket = tickets[0];

        const assignments = await this.database.query(
            `SELECT assignment_id
             FROM ticket_assignments
             WHERE ticket_id = ?
             AND agent_id = ?
             AND unassigned_at IS NULL`,
            [ticketId, user.sub]
        );

        if (!assignments.length) {
            throw new ForbiddenException(
                'You are not assigned to this ticket'
            );
        }

        if (['Resolved', 'Closed'].includes(ticket.status)) {
            throw new ConflictException(
                'Cannot request clarification for a resolved or closed ticket'
            );
        }

   const customers = await this.database.query(
    `SELECT
        presence_status,
        last_seen_at,
        CASE
            WHEN presence_status = 'Online'
             AND last_seen_at >= DATE_SUB(
                CURRENT_TIMESTAMP,
                INTERVAL 2 MINUTE
             )
            THEN TRUE
            ELSE FALSE
        END AS is_online
     FROM users
     WHERE user_id = ?
     AND role = 'customer'`,
    [ticket.customer_id]
);

if (!customers.length) {
    throw new NotFoundException('Customer not found');
}

const customerOnline = Boolean(
    customers[0].is_online
);

        const result = await this.database.query(
            `INSERT INTO ticket_clarifications
            (
                ticket_id,
                agent_id,
                customer_id,
                question,
                status
            )
            VALUES (?, ?, ?, ?, 'Waiting')`,
            [
                ticketId,
                user.sub,
                ticket.customer_id,
                question
            ]
        );

        const clarificationId = result.insertId;

        await this.logActivity(
            ticketId,
            user.sub,
            'COMMENT_ADDED',
            null,
            question,
            'Agent requested clarification from the customer.'
        );

        if (customerOnline) {
            await this.notifications.createNotification(
                ticket.customer_id,
                ticketId,
                'Clarification Requested',
                `The agent has asked a question about ticket #${ticketId}.`
            );
        } else {
            if (ticket.status !== 'On Hold') {
                await this.database.query(
                    `UPDATE tickets
                     SET status = 'On Hold',
                         resolved_at = NULL
                     WHERE ticket_id = ?`,
                    [ticketId]
                );

                await this.logActivity(
                    ticketId,
                    user.sub,
                    'ON_HOLD',
                    ticket.status,
                    'On Hold',
                    'Ticket placed On Hold because the customer is offline and clarification is required.'
                );
            }

            await this.notifyManagers(
                ticketId,
                'Customer Offline - Clarification Required',
                `Agent #${user.sub} requested clarification for ticket #${ticketId}, but the customer is offline.`
            );
        }

        return {
            message: customerOnline
                ? 'Clarification requested. Customer is online.'
                : 'Clarification requested. Customer is offline and ticket is On Hold.',
            clarification_id: clarificationId,
            ticket_id: Number(ticketId),
            customer_online: customerOnline,
            ticket_status: customerOnline
                ? ticket.status
                : 'On Hold'
        };
    }

    // ==========================================
    // RESPOND TO CLARIFICATION - CUSTOMER
    // ==========================================

    async respondToClarification(
        ticketId,
        clarificationId,
        user,
        data
    ) {
        if (user.role !== 'customer') {
            throw new ForbiddenException(
                'Only customers can respond to clarification'
            );
        }

        const response = String(data.response || '').trim();

        if (!response) {
            throw new BadRequestException(
                'Clarification response is required'
            );
        }

        const clarifications = await this.database.query(
            `SELECT clarification_id,
                    ticket_id,
                    agent_id,
                    customer_id,
                    status
             FROM ticket_clarifications
             WHERE clarification_id = ?
             AND ticket_id = ?`,
            [clarificationId, ticketId]
        );

        if (!clarifications.length) {
            throw new NotFoundException(
                'Clarification request not found'
            );
        }

        const clarification = clarifications[0];

        if (
            Number(clarification.customer_id) !== Number(user.sub)
        ) {
            throw new ForbiddenException(
                'You cannot respond to this clarification'
            );
        }

        if (clarification.status !== 'Waiting') {
            throw new ConflictException(
                'This clarification has already been answered or cancelled'
            );
        }

        await this.database.query(
            `UPDATE ticket_clarifications
             SET customer_response = ?,
                 status = 'Responded',
                 responded_at = CURRENT_TIMESTAMP
             WHERE clarification_id = ?`,
            [response, clarificationId]
        );

        await this.logActivity(
            ticketId,
            user.sub,
            'COMMENT_ADDED',
            null,
            response,
            'Customer responded to the clarification request.'
        );

        await this.notifications.createNotification(
            clarification.agent_id,
            ticketId,
            'Customer Replied',
            `The customer has responded to your clarification request for ticket #${ticketId}.`
        );

        await this.notifyManagers(
            ticketId,
            'Customer Clarification Received',
            `The customer has responded to the clarification request for ticket #${ticketId}.`
        );

        return {
            message: 'Clarification response submitted successfully',
            clarification_id: Number(clarificationId),
            ticket_id: Number(ticketId),
            status: 'Responded'
        };
    }

    // ==========================================
    // UPDATE STATUS - AGENT / MANAGER
    // ==========================================

    // ==========================================
    // GET CLARIFICATIONS - ALL AUTHORIZED ROLES
    // ==========================================

    async getClarifications(ticketId, user) {
        // Verify customer ownership, agent assignment,
        // or manager access.
        await this.getTicketById(ticketId, user);

        return this.database.query(
            `SELECT
                clarification_id,
                ticket_id,
                agent_id,
                customer_id,
                question,
                customer_response,
                status,
                created_at,
                responded_at
             FROM ticket_clarifications
             WHERE ticket_id = ?
             ORDER BY created_at DESC`,
            [ticketId]
        );
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
            `SELECT ticket_id, status
             FROM tickets
             WHERE ticket_id = ?`,
            [ticketId]
        );

        if (!tickets.length) {
            throw new NotFoundException('Ticket not found');
        }

        const oldStatus = tickets[0].status;

        if (oldStatus !== 'On Hold') {
            throw new ConflictException(
                'Only On Hold tickets can be resumed'
            );
        }

        await this.database.query(
            `UPDATE tickets
             SET status = 'In Progress',
                 resolved_at = NULL
             WHERE ticket_id = ?`,
            [ticketId]
        );

        await this.logActivity(
            ticketId,
            user.sub,
            'STATUS_CHANGED',
            'On Hold',
            'In Progress',
            'Manager resumed the ticket.'
        );

        await this.notifyCustomer(
            ticketId,
            'Ticket Resumed',
            `Your ticket #${ticketId} is now being processed again.`
        );

        const assignments = await this.database.query(
            `SELECT agent_id
             FROM ticket_assignments
             WHERE ticket_id = ?
             AND unassigned_at IS NULL`,
            [ticketId]
        );

        if (assignments.length) {
            await this.notifications.createNotification(
                assignments[0].agent_id,
                ticketId,
                'Ticket Resumed',
                `Manager resumed ticket #${ticketId}. You can continue working on it.`
            );
        }

        return {
            message: 'Ticket resumed successfully',
            ticket_id: Number(ticketId),
            old_status: oldStatus,
            status: 'In Progress'
        };
    }

    


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

        // Validate agent assignment

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

        // Update status and resolution timestamp

        await this.database.query(
            `UPDATE tickets
             SET status = ?,
                 resolved_at = CASE
                    WHEN ? = 'Resolved' THEN CURRENT_TIMESTAMP
                    WHEN ? IN ('Open', 'In Progress', 'On Hold', 'Reopened')
                        THEN NULL
                    ELSE resolved_at
                 END
             WHERE ticket_id = ?`,
            [status, status, status, id]
        );

        // Record activity only when status actually changes

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
