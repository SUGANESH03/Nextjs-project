
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/common/DashboardLayout";
import ProtectedRoute from "../../utils/ProtectedRoute";
import ticketService from "../../services/ticketService";
import StatusBadge from "../../components/tickets/StatusBadge";

export default function AssignedTickets() {
    const router = useRouter();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadTickets = async () => {
        try {
            setError("");

            const result = await ticketService.getAll();

            const data = Array.isArray(result)
                ? result
                : result.tickets || [];

            setTickets(data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load assigned tickets."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    return (
        <ProtectedRoute allowedRoles={["agent"]}>
            <DashboardLayout title="Assigned Tickets">
                {error && (
                    <div className="alert alert-danger">{error}</div>
                )}

                <div className="card border-0 shadow-sm">
                    <div className="card-body">
                        <div className="d-flex justify-content-between mb-3">
                            <h5 className="fw-bold">
                                My Assigned Tickets
                            </h5>

                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={loadTickets}
                            >
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-5">
                                <h6>No assigned tickets</h6>
                                <p className="text-muted">
                                    Tickets assigned to you will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Subject</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {tickets.map((ticket) => (
                                            <tr key={ticket.ticket_id}>
                                                <td>#{ticket.ticket_id}</td>
                                                <td>{ticket.subject}</td>
                                                <td>{ticket.priority}</td>
                                                <td>
                                                    <StatusBadge
                                                        status={ticket.status}
                                                    />
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() =>
                                                            router.push(
                                                                `/agent/tickets/${ticket.ticket_id}`
                                                            )
                                                        }
                                                    >
                                                        Open Ticket
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
