
"use client";

import { useState } from "react";
import ticketService from "../../services/ticketService";

export default function TicketStatus({ ticketId, currentStatus, onUpdated }) {
    const [status, setStatus] = useState(currentStatus || "open");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleUpdate = async () => {
        try {
            setLoading(true);
            setError("");

            await ticketService.updateStatus(ticketId, status);

            if (onUpdated) {
                await onUpdated(status);
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update ticket status."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-body">
                <h6 className="fw-bold mb-3">
                    Update Ticket Status
                </h6>

                {error && (
                    <div className="alert alert-danger py-2">
                        {error}
                    </div>
                )}

                <div className="d-flex flex-wrap gap-2">
                    <select
                        className="form-select"
                        style={{ maxWidth: "220px" }}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                        <option value="reopened">Reopened</option>
                    </select>

                    <button
                        className="btn btn-primary"
                        onClick={handleUpdate}
                        disabled={loading || status === currentStatus}
                    >
                        {loading ? "Updating..." : "Update Status"}
                    </button>
                </div>
            </div>
        </div>
    );
}
