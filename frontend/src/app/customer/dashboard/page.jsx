
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProtectedRoute from "../../utils/ProtectedRoute";
import DashboardLayout from "../../components/common/DashboardLayout";
import ticketService from "../../services/ticketService";
import presenceService from "../../services/presenceService";
import StatusBadge from "../../components/tickets/StatusBadge";
import { useAuth } from "../../context/AuthContext";

export default function CustomerDashboard() {
    const { user } = useAuth();

    const [tickets, setTickets] = useState([]);
    const [presence, setPresence] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const normalizeStatus = (status) =>
        String(status || "").trim().toLowerCase();

    const loadDashboard = async () => {
        try {
            setError("");

            const [ticketResult] = await Promise.all([
                ticketService.getAll()
            ]);

            const list = Array.isArray(ticketResult)
                ? ticketResult
                : ticketResult.tickets || ticketResult.data || [];

            setTickets(list);

            // Get customer's own presence from the profile
            // without requesting the manager-only presence list.
            try {
                const profile = await presenceService.heartbeat();

                setPresence({
                    presence_status: profile.presence_status || "Online",
                    last_seen_at: profile.last_seen_at || new Date().toISOString()
                });
            } catch (presenceError) {
                console.error("Presence update failed:", presenceError);
            }

        } catch (err) {
            console.error("Customer dashboard error:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load dashboard."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();

        const interval = setInterval(() => {
            loadDashboard();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const openTickets = tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "open"
    );

    const inProgressTickets = tickets.filter(
        (ticket) =>
            ["in progress", "in_progress"].includes(
                normalizeStatus(ticket.status)
            )
    );

    const onHoldTickets = tickets.filter(
        (ticket) =>
            ["on hold", "on_hold", "pending"].includes(
                normalizeStatus(ticket.status)
            )
    );

    const resolvedTickets = tickets.filter(
        (ticket) =>
            ["resolved", "closed"].includes(
                normalizeStatus(ticket.status)
            )
    );

    const stats = [
        {
            label: "Total Tickets",
            value: tickets.length,
            icon: "bi-ticket-perforated",
            color: "primary"
        },
        {
            label: "Open Tickets",
            value: openTickets.length,
            icon: "bi-folder2-open",
            color: "info"
        },
        {
            label: "In Progress",
            value: inProgressTickets.length,
            icon: "bi-arrow-repeat",
            color: "primary"
        },
        {
            label: "On Hold",
            value: onHoldTickets.length,
            icon: "bi-pause-circle",
            color: "warning"
        },
        {
            label: "Resolved",
            value: resolvedTickets.length,
            icon: "bi-check-circle",
            color: "success"
        }
    ];

    const filteredTickets = tickets.filter((ticket) => {
        const matchesSearch =
            String(ticket.ticket_id || ticket.id || "")
                .includes(search) ||
            String(ticket.subject || "")
                .toLowerCase()
                .includes(search.toLowerCase());

        const matchesStatus =
            statusFilter === "All" ||
            normalizeStatus(ticket.status) ===
                normalizeStatus(statusFilter);

        return matchesSearch && matchesStatus;
    });

    const formatDate = (date) => {
        if (!date) return "Not available";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return "Not available";
        }

        return parsed.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <ProtectedRoute allowedRoles={["customer"]}>
            <DashboardLayout title="Customer Dashboard">

                {/* WELCOME SECTION */}
                <div className="card border-0 shadow-sm mb-4 overflow-hidden">
                    <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">

                            <div>
                                <span className="badge text-bg-primary mb-2">
                                    Customer Portal
                                </span>

                                <h3 className="fw-bold mb-2">
                                    Welcome, {user?.full_name || "Customer"}!
                                </h3>

                                <p className="text-muted mb-0">
                                    Track your support requests and stay
                                    updated on your tickets.
                                </p>
                            </div>

                            <Link
                                href="/customer/tickets/create-ticket"
                                className="btn btn-primary btn-lg"
                            >
                                <i className="bi bi-plus-circle me-2"></i>
                                Create New Ticket
                            </Link>

                        </div>
                    </div>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                {/* PRESENCE CARD */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">

                            <div>
                                <h5 className="fw-bold mb-1">
                                    My Availability
                                </h5>

                                <p className="text-muted mb-0">
                                    Your current application presence.
                                </p>
                            </div>

                            <span className="badge rounded-pill text-bg-success px-3 py-2">
                                <i className="bi bi-circle-fill me-2"></i>
                                {presence?.presence_status || "Checking..."}
                            </span>

                        </div>

                        <hr />

                        <small className="text-muted">
                            Last activity:{" "}
                            {formatDate(presence?.last_seen_at)}
                        </small>

                    </div>
                </div>

                {/* STATISTICS */}
                <div className="row g-3 mb-4">
                    {stats.map((item) => (
                        <div
                            className="col-12 col-sm-6 col-xl"
                            key={item.label}
                        >
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body p-3">

                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <span className="text-muted small">
                                            {item.label}
                                        </span>

                                        <span className={`text-${item.color} fs-4`}>
                                            <i className={`bi ${item.icon}`}></i>
                                        </span>
                                    </div>

                                    <h3 className="fw-bold mb-0">
                                        {loading ? "..." : item.value}
                                    </h3>

                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* TICKET TABLE */}
                <div className="card border-0 shadow-sm">

                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">

                            <div>
                                <h5 className="fw-bold mb-1">
                                    My Recent Tickets
                                </h5>

                                <p className="text-muted small mb-0">
                                    Monitor the progress of your support requests.
                                </p>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={loadDashboard}
                                    disabled={loading}
                                >
                                    <i className="bi bi-arrow-clockwise me-1"></i>
                                    Refresh
                                </button>

                                <Link
                                    href="/customer/tickets"
                                    className="btn btn-outline-dark btn-sm"
                                >
                                    View All
                                </Link>
                            </div>

                        </div>

                        {/* SEARCH AND FILTER */}
                        <div className="row g-3 mb-4">

                            <div className="col-md-7">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search ticket ID or subject..."
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                />
                            </div>

                            <div className="col-md-5">
                                <select
                                    className="form-select"
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                    <option value="Reopened">Reopened</option>
                                </select>
                            </div>

                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary"></div>
                                <p className="text-muted mt-2">
                                    Loading your tickets...
                                </p>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="bi bi-ticket-perforated fs-1 text-muted"></i>

                                <h5 className="fw-bold mt-3">
                                    No tickets found
                                </h5>

                                <p className="text-muted">
                                    Try changing your search or create a new ticket.
                                </p>

                                <Link
                                    href="/customer/tickets/create-ticket"
                                    className="btn btn-primary"
                                >
                                    Create Ticket
                                </Link>
                            </div>
                        ) : (
                            <div className="table-responsive">

                                <table className="table table-hover align-middle">

                                    <thead className="table-light">
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Subject</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                            <th>Created</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredTickets.slice(0, 10).map((ticket) => {
                                            const id =
                                                ticket.ticket_id || ticket.id;

                                            return (
                                                <tr key={id}>
                                                    <td className="fw-semibold">
                                                        #{id}
                                                    </td>

                                                    <td>
                                                        {ticket.subject}
                                                    </td>

                                                    <td>
                                                        <span className="fw-semibold">
                                                            {ticket.priority}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <StatusBadge
                                                            status={ticket.status}
                                                        />
                                                    </td>

                                                    <td className="small text-muted">
                                                        {formatDate(ticket.created_at)}
                                                    </td>

                                                    <td>
                                                        <Link
                                                            href={`/customer/tickets/${id}`}
                                                            className="btn btn-sm btn-outline-primary"
                                                        >
                                                            View Ticket
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>

                                </table>

                            </div>
                        )}

                    </div>
                </div>

                {/* QUICK LINKS */}
                <div className="row g-3 mt-2">

                    <div className="col-md-6">
                        <Link
                            href="/customer/tickets"
                            className="card border-0 shadow-sm text-decoration-none h-100"
                        >
                            <div className="card-body d-flex align-items-center gap-3">
                                <i className="bi bi-ticket-detailed fs-2 text-primary"></i>

                                <div>
                                    <h6 className="fw-bold text-dark mb-1">
                                        My Tickets
                                    </h6>

                                    <small className="text-muted">
                                        View your complete ticket history.
                                    </small>
                                </div>
                            </div>
                        </Link>
                    </div>

                    <div className="col-md-6">
                        <Link
                            href="/customer/notifications"
                            className="card border-0 shadow-sm text-decoration-none h-100"
                        >
                            <div className="card-body d-flex align-items-center gap-3">
                                <i className="bi bi-bell fs-2 text-primary"></i>

                                <div>
                                    <h6 className="fw-bold text-dark mb-1">
                                        Notifications
                                    </h6>

                                    <small className="text-muted">
                                        View updates about your support tickets.
                                    </small>
                                </div>
                            </div>
                        </Link>
                    </div>

                </div>

            </DashboardLayout>
        </ProtectedRoute>
    );
}
