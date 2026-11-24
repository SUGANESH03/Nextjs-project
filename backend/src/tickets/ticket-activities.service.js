
const { Injectable } = require('@nestjs/common');

class TicketActivitiesService {
    constructor(database) {
        this.database = database;
    }

    // ==========================================
    // LOG TICKET ACTIVITY
    // ==========================================

    async logActivity({
        ticketId,
        userId,
        activityType,
        oldValue = null,
        newValue = null,
        description = null
    }) {
        return this.database.query(
            `INSERT INTO ticket_activities
            (
                ticket_id,
                user_id,
                activity_type,
                old_value,
                new_value,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                ticketId,
                userId || null,
                activityType,
                oldValue,
                newValue,
                description
            ]
        );
    }

    // ==========================================
    // GET TICKET ACTIVITIES
    // ==========================================

    async getActivities(ticketId) {
        return this.database.query(
            `SELECT
                a.activity_id,
                a.ticket_id,
                a.user_id,
                COALESCE(u.full_name, 'System') AS full_name,
                COALESCE(u.role, 'system') AS role,
                a.activity_type,
                a.old_value,
                a.new_value,
                a.description,
                a.created_at
             FROM ticket_activities a
             LEFT JOIN users u
                ON a.user_id = u.user_id
             WHERE a.ticket_id = ?
             ORDER BY a.created_at ASC, a.activity_id ASC`,
            [ticketId]
        );
    }
}

Injectable()(TicketActivitiesService);

module.exports = TicketActivitiesService;
