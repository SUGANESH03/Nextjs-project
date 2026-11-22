
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import ProtectedRoute from "../../utils/ProtectedRoute";
import DashboardLayout from "../../components/common/DashboardLayout";
import ticketService from "../../services/ticketService";
import StatusBadge from "../../components/tickets/StatusBadge";

const normalize = (value) =>
    String(value || "").trim().toLowerCase();

export default function CustomerTicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [priorityFilter, setPriorityFilter] = useState("All");
    const [sortOrder, setSortOrder] = useState("newest");

    const loadTickets = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const response = await ticketService.getAll();

            const list = Array.isArray(response)
                ? response
                : response?.tickets || response?.data || [];

            setTickets(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load tickets. Please try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const stats = useMemo(() => {
        const count = (status) =>
            tickets.filter(
                (ticket) => normalize(ticket.status) === normalize(status)
            ).length;

        return {
            total: tickets.length,
            open: count("Open"),
            progress: count("In Progress"),
            pending: count("Pending") + count("On Hold"),
            resolved: count("Resolved") + count("Closed"),
        };
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        const result = tickets.filter((ticket) => {
            const id = ticket.ticket_id || ticket.id || "";

            const matchesSearch =
                normalize(ticket.subject).includes(normalize(search)) ||
                String(id).includes(search.trim());

            const matchesStatus =
                statusFilter === "All" ||
                normalize(ticket.status) === normalize(statusFilter);

            const matchesPriority =
                priorityFilter === "All" ||
                normalize(ticket.priority) === normalize(priorityFilter);

            return matchesSearch && matchesStatus && matchesPriority;
        });

        return [...result].sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();

            return sortOrder === "newest"
                ? dateB - dateA
                : dateA - dateB;
        });
    }, [tickets, search, statusFilter, priorityFilter, sortOrder]);

    const formatDate = (date) => {
        if (!date) return "—";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) return "—";

        return parsed.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <ProtectedRoute allowedRoles={["customer"]}>
            <DashboardLayout title="My Tickets">

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">Support Requests</h4>
                        <p className="text-secondary mb-0">
                            View, track and manage your support tickets.
                        </p>
                    </div>

                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => loadTickets(true)}
                            disabled={loading || refreshing}
                        >
                            <i className="bi bi-arrow-clockwise me-2"></i>
                            {refreshing ? "Refreshing..." : "Refresh"}
                        </button>

                        <Link
                            href="/customer/tickets/create-ticket"
                            className="btn btn-primary"
                        >
                            <i className="bi bi-plus-lg me-2"></i>
                            Create Ticket
                        </Link>
                    </div>
                </div>

                {/* Statistics */}
                <div className="row g-3 mb-4">
                    {[
                        {
                            label: "Total Tickets",
                            value: stats.total,
                            icon: "bi-ticket-perforated",
                            color: "primary",
                        },
                        {
                            label: "Open",
                            value: stats.open,
                            icon: "bi-folder2-open",
                            color: "info",
                        },
                        {
                            label: "In Progress",
                            value: stats.progress,
                            icon: "bi-hourglass-split",
                            color: "warning",
                        },
                        {
                            label: "Pending / On Hold",
                            value: stats.pending,
                            icon: "bi-pause-circle",
                            color: "secondary",
                        },
                        {
                            label: "Resolved / Closed",
                            value: stats.resolved,
                            icon: "bi-check-circle",
                            color: "success",
                        },
                    ].map((item) => (
                        <div
                            className="col-12 col-sm-6 col-lg"
                            key={item.label}
                        >
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body d-flex justify-content-between align-items-center">
                                    <div>
                                        <p className="text-secondary small mb-2">
                                            {item.label}
                                        </p>
                                        <h3 className="fw-bold mb-0">
                                            {item.value}
                                        </h3>
                                    </div>

                                    <div
                                        className={`rounded-3 bg-${item.color}-subtle text-${item.color} p-3`}
                                    >
                                        <i className={`bi ${item.icon} fs-4`}></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Ticket table */}
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-0 pt-4 px-4">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div>
                                <h5 className="fw-bold mb-1">All My Tickets</h5>
                                <p className="text-secondary small mb-0">
                                    {filteredTickets.length} ticket(s) found
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card-body px-4">

                        {error && (
                            <div className="alert alert-danger d-flex justify-content-between align-items-center">
                                <span>{error}</span>
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => loadTickets()}
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Filters */}
                        <div className="row g-3 mb-4">
                            <div className="col-12 col-md-5">
                                <label className="form-label small fw-semibold">
                                    Search tickets
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light">
                                        <i className="bi bi-search"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search subject or ticket ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="col-12 col-md-2">
                                <label className="form-label small fw-semibold">
                                    Status
                                </label>
                                <select
                                    className="form-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Pending">Pending</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                    <option value="Reopened">Reopened</option>
                                </select>
                            </div>

                            <div className="col-12 col-md-2">
                                <label className="form-label small fw-semibold">
                                    Priority
                                </label>
                                <select
                                    className="form-select"
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                >
                                    <option value="All">All Priorities</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>

                            <div className="col-12 col-md-3">
                                <label className="form-label small fw-semibold">
                                    Sort by
                                </label>
                                <select
                                    className="form-select"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div
                                    className="spinner-border text-primary"
                                    role="status"
                                ></div>
                                <p className="text-secondary mt-3 mb-0">
                                    Loading your tickets...
                                </p>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="bi bi-inbox display-4 text-secondary"></i>
                                <h5 className="fw-bold mt-3">
                                    {tickets.length === 0
                                        ? "No tickets yet"
                                        : "No matching tickets"}
                                </h5>
                                <p className="text-secondary">
                                    {tickets.length === 0
                                        ? "Create a support ticket and our team will help you."
                                        : "Try changing your search or filters."}
                                </p>

                                {tickets.length === 0 && (
                                    <Link
                                        href="/customer/tickets/create-ticket"
                                        className="btn btn-primary"
                                    >
                                        <i className="bi bi-plus-lg me-2"></i>
                                        Create Your First Ticket
                                    </Link>
                                )}

                                {tickets.length > 0 && (
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => {
                                            setSearch("");
                                            setStatusFilter("All");
                                            setPriorityFilter("All");
                                        }}
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Ticket</th>
                                            <th>Subject</th>
                                            <th>Category</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                            <th>Created</th>
                                            <th className="text-end">Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredTickets.map((ticket) => {
                                            const id =
                                                ticket.ticket_id || ticket.id;

                                            return (
                                                <tr key={id}>
                                                    <td>
                                                        <span className="fw-semibold text-primary">
                                                            #{id}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {ticket.subject || "Untitled"}
                                                        </div>
                                                        <small className="text-secondary">
                                                            {ticket.description
                                                                ? `${ticket.description.slice(0, 55)}${ticket.description.length > 55 ? "..." : ""}`
                                                                : "No description"}
                                                        </small>
                                                    </td>

                                                    <td>
                                                        {ticket.category || "—"}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`badge ${
                                                                normalize(ticket.priority) === "critical"
                                                                    ? "text-bg-danger"
                                                                    : normalize(ticket.priority) === "high"
                                                                    ? "text-bg-warning"
                                                                    : normalize(ticket.priority) === "medium"
                                                                    ? "text-bg-info"
                                                                    : "text-bg-secondary"
                                                            }`}
                                                        >
                                                            {ticket.priority || "—"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <StatusBadge
                                                            status={ticket.status}
                                                        />
                                                    </td>

                                                    <td className="text-secondary small">
                                                        {formatDate(ticket.created_at)}
                                                    </td>

                                                    <td className="text-end">
                                                        <Link
                                                            href={`/customer/tickets/${id}`}
                                                            className="btn btn-sm btn-outline-primary"
                                                        >
                                                            View Details
                                                            <i className="bi bi-arrow-right ms-2"></i>
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

            </DashboardLayout>
        </ProtectedRoute>
    );
}
