
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/common/DashboardLayout";
import ProtectedRoute from "../../utils/ProtectedRoute";
import ticketService from "../../services/ticketService";
import StatusBadge from "../../components/tickets/StatusBadge";

export default function AllTickets() {
    const router = useRouter();

    const [tickets, setTickets] = useState([]);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
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
            setError("Unable to load tickets.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    useEffect(() => {
        const filtered = tickets.filter((ticket) => {
            const matchesSearch =
                String(ticket.ticket_id).includes(search) ||
                String(ticket.subject || "")
                    .toLowerCase()
                    .includes(search.toLowerCase());

            const matchesStatus =
                status === "all" ||
                String(ticket.status).toLowerCase() === status;

            return matchesSearch && matchesStatus;
        });

        setFilteredTickets(filtered);
    }, [tickets, search, status]);

    return (
        <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardLayout title="All Support Tickets">
                {error && (
                    <div className="alert alert-danger">{error}</div>
                )}

                <div className="card border-0 shadow-sm">
                    <div className="card-body">
                        <div className="row g-3 mb-4">
                            <div className="col-md-7">
                                <input
                                    className="form-control"
                                    placeholder="Search ticket ID or subject..."
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                />
                            </div>

                            <div className="col-md-3">
                                <select
                                    className="form-select"
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(e.target.value)
                                    }
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="open">Open</option>
                                    <option value="in_progress">
                                        In Progress
                                    </option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                    <option value="reopened">Reopened</option>
                                </select>
                            </div>

                            <div className="col-md-2">
                                <button
                                    className="btn btn-outline-primary w-100"
                                    onClick={loadTickets}
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" />
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="text-center py-5">
                                <h6>No matching tickets</h6>
                                <p className="text-muted">
                                    Try changing your search or filter.
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Subject</th>
                                            <th>Customer</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredTickets.map((ticket) => (
                                            <tr key={ticket.ticket_id}>
                                                <td>#{ticket.ticket_id}</td>
                                                <td>{ticket.subject}</td>
                                                <td>
                                                    {ticket.customer_name ||
                                                        ticket.full_name ||
                                                        "Customer"}
                                                </td>
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
                                                                `/manager/tickets/${ticket.ticket_id}`
                                                            )
                                                        }
                                                    >
                                                        View
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
