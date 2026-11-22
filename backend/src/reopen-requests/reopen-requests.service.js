
const {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    ConflictException
} = require("@nestjs/common");

class ReopenRequestsService {
    constructor(database, notifications) {
        this.database = database;
        this.notifications = notifications;
    }

    // NOTIFY ALL ACTIVE MANAGERS
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

    // CUSTOMER: REQUEST TICKET REOPENING
    async createRequest(ticketId, user, data) {
        if (user.role !== "customer") {
            throw new ForbiddenException(
                "Only customers can request reopening"
            );
        }

        const reason = String(data?.reason || "").trim();

        if (reason.length < 5) {
            throw new BadRequestException(
                "Please provide a valid reopening reason (minimum 5 characters)"
            );
        }

        const tickets = await this.database.query(
            `SELECT ticket_id, customer_id, status
             FROM tickets
             WHERE ticket_id = ?`,
            [ticketId]
        );

        if (!tickets.length) {
            throw new NotFoundException("Ticket not found");
        }

        const ticket = tickets[0];

        if (Number(ticket.customer_id) !== Number(user.sub)) {
            throw new ForbiddenException("Access denied");
        }

        if (!["Resolved", "Closed"].includes(ticket.status)) {
            throw new ConflictException(
                "Only resolved or closed tickets can be reopened"
            );
        }

        const pending = await this.database.query(
            `SELECT request_id
             FROM ticket_reopen_requests
             WHERE ticket_id = ?
             AND status = 'Pending'`,
            [ticketId]
        );

        if (pending.length) {
            throw new ConflictException(
                "A reopening request is already pending"
            );
        }

        const result = await this.database.query(
            `INSERT INTO ticket_reopen_requests
             (ticket_id, requested_by, reason, status)
             VALUES (?, ?, ?, 'Pending')`,
            [ticketId, user.sub, reason]
        );

        await this.notifyManagers(
            ticketId,
            "Ticket Reopening Request",
            `A customer has requested reopening ticket #${ticketId}. Reason: ${reason}`
        );

        return {
            message: "Reopening request submitted successfully",
            request_id: result.insertId
        };
    }

    // MANAGER: GET ALL REOPENING REQUESTS
    async getRequests(user) {
        if (user.role !== "manager") {
            throw new ForbiddenException(
                "Manager access required"
            );
        }

        return this.database.query(
            `SELECT
                r.*,
                t.subject,
                t.status AS ticket_status,
                u.full_name AS customer_name,
                u.email AS customer_email
             FROM ticket_reopen_requests r
             JOIN tickets t ON r.ticket_id = t.ticket_id
             JOIN users u ON r.requested_by = u.user_id
             ORDER BY
                CASE WHEN r.status = 'Pending' THEN 0 ELSE 1 END,
                r.requested_at DESC`
        );
    }

    // MANAGER: APPROVE OR REJECT REOPEN REQUEST
    async reviewRequest(requestId, user, data) {
        if (user.role !== "manager") {
            throw new ForbiddenException(
                "Manager access required"
            );
        }

        // Accept approve, Approved, reject, Rejected
        const inputDecision = String(
            data?.decision || ""
        ).trim().toLowerCase();

        let decision;

        if (
            inputDecision === "approve" ||
            inputDecision === "approved"
        ) {
            decision = "Approved";
        } else if (
            inputDecision === "reject" ||
            inputDecision === "rejected"
        ) {
            decision = "Rejected";
        } else {
            throw new BadRequestException(
                "Decision must be Approved or Rejected"
            );
        }

        const managerComment = String(
            data?.manager_comment || ""
        ).trim();

        const requests = await this.database.query(
            `SELECT *
             FROM ticket_reopen_requests
             WHERE request_id = ?`,
            [requestId]
        );

        if (!requests.length) {
            throw new NotFoundException(
                "Reopening request not found"
            );
        }

        const request = requests[0];

        if (request.status !== "Pending") {
            throw new ConflictException(
                "This request has already been reviewed"
            );
        }

        /*
         * Conditional update prevents a second manager
         * from reviewing an already-reviewed request.
         */
        const updateResult = await this.database.query(
            `UPDATE ticket_reopen_requests
             SET status = ?,
                 reviewed_by = ?,
                 manager_comment = ?,
                 reviewed_at = CURRENT_TIMESTAMP
             WHERE request_id = ?
             AND status = 'Pending'`,
            [
                decision,
                user.sub,
                managerComment || null,
                requestId
            ]
        );

        if (!updateResult.affectedRows) {
            throw new ConflictException(
                "This request has already been reviewed"
            );
        }

        // APPROVE: CHANGE TICKET STATUS
        if (decision === "Approved") {
            await this.database.query(
                `UPDATE tickets
                 SET status = 'Reopened',
                     resolved_at = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE ticket_id = ?`,
                [request.ticket_id]
            );
        }

        // NOTIFY CUSTOMER
        const notificationMessage =
            decision === "Approved"
                ? `Your reopening request for ticket #${request.ticket_id} has been approved.`
                : `Your reopening request for ticket #${request.ticket_id} has been rejected.${
                    managerComment
                        ? ` Manager comment: ${managerComment}`
                        : ""
                }`;

        await this.notifications.createNotification(
            request.requested_by,
            request.ticket_id,
            `Reopening Request ${decision}`,
            notificationMessage
        );

        return {
            message: `Reopening request ${decision.toLowerCase()} successfully`,
            request_id: requestId,
            decision
        };
    }

    // CUSTOMER: GET OWN REOPENING REQUESTS
    async getMyRequests(user) {
        if (user.role !== "customer") {
            throw new ForbiddenException(
                "Only customers can access this endpoint"
            );
        }

        return this.database.query(
            `SELECT
                r.*,
                t.subject,
                t.status AS ticket_status
             FROM ticket_reopen_requests r
             JOIN tickets t ON r.ticket_id = t.ticket_id
             WHERE r.requested_by = ?
             ORDER BY r.requested_at DESC`,
            [user.sub]
        );
    }
}

Injectable()(ReopenRequestsService);

module.exports = ReopenRequestsService;
