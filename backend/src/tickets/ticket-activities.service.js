
const { Injectable } = require('@nestjs/common');

class TicketActivitiesService {
    constructor(database) {
        this.database = database;
    }

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
                userId,
                activityType,
                oldValue,
                newValue,
                description
            ]
        );
    }

    async getActivities(ticketId) {
        return this.database.query(
            `SELECT
                a.activity_id,
                a.ticket_id,
                a.user_id,
                u.full_name,
                u.role,
                a.activity_type,
                a.old_value,
                a.new_value,
                a.description,
                a.created_at
             FROM ticket_activities a
             INNER JOIN users u
                ON a.user_id = u.user_id
             WHERE a.ticket_id = ?
             ORDER BY a.created_at DESC`,
            [ticketId]
        );
    }
}

Injectable()(TicketActivitiesService);

module.exports = TicketActivitiesService;
