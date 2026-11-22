
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    Ticket,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowRight
} from "lucide-react";

import DashboardLayout from "../../components/common/DashboardLayout";
import ProtectedRoute from "../../utils/ProtectedRoute";
import ticketService from "../../services/ticketService";
import StatusBadge from "../../components/tickets/StatusBadge";

const STATUS_OPTIONS = [
    "Open",
    "In Progress",
    "Pending",
    "Resolved",
    "Closed",
    "Reopened"
];

const normalizeStatus = (status) =>
    String(status || "").trim().toLowerCase();

export default function AgentDashboard() {
    const router = useRouter();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [busyId, setBusyId] = useState(null);
    const [selectedStatuses, setSelectedStatuses] = useState({});

    const loadTickets = async () => {
        try {
            setError("");

            const result = await ticketService.getAll();

            const data = Array.isArray(result)
                ? result
                : result.tickets || result.data || [];

            setTickets(data);

            setSelectedStatuses((previous) => {
                const updated = { ...previous };

                data.forEach((ticket) => {
                    const id = ticket.ticket_id;

                    if (!(id in updated)) {
                        updated[id] = ticket.status;
                    }
                });

                return updated;
            });

        } catch (err) {
            console.error("Loading tickets failed:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load tickets."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    // Available tickets can be claimed by the agent
    const isAvailable = (ticket) => {
        const status = normalizeStatus(ticket.status);

        return status === "open" || status === "reopened";
    };

    // Claim an unassigned ticket
    const claimTicket = async (id) => {
        try {
            setBusyId(id);
            setError("");
            setSuccess("");

            const response = await ticketService.claim(id);

            setSuccess(
                response.message || `Ticket #${id} claimed successfully.`
            );

            await loadTickets();

        } catch (err) {
            console.error("Claim ticket failed:", err);

            const message = err.response?.data?.message;

            setError(
                Array.isArray(message)
                    ? message.join(", ")
                    : message || "Unable to claim ticket."
            );
        } finally {
            setBusyId(null);
        }
    };

    // Update assigned ticket status
    const updateTicketStatus = async (ticket) => {
        const id = ticket.ticket_id;
        const newStatus = selectedStatuses[id];

        if (!newStatus || newStatus === ticket.status) {
            return;
        }

        try {
            setBusyId(id);
            setError("");
            setSuccess("");

            const response = await ticketService.updateStatus(
                id,
                newStatus
            );

            setSuccess(
                response.message || "Ticket status updated successfully."
            );

            await loadTickets();

        } catch (err) {
            console.error("Status update failed:", err);

            const message = err.response?.data?.message;

            setError(
                Array.isArray(message)
                    ? message.join(", ")
                    : message || "Unable to update ticket status."
            );
        } finally {
            setBusyId(null);
        }
    };

    const availableTickets = tickets.filter(isAvailable);

    const activeTickets = tickets.filter((ticket) =>
        ["in progress", "pending"].includes(
            normalizeStatus(ticket.status)
        )
    );

    const resolvedTickets = tickets.filter((ticket) =>
        ["resolved", "closed"].includes(
            normalizeStatus(ticket.status)
        )
    );

    const stats = [
        {
            title: "Available Tickets",
            value: availableTickets.length,
            icon: Ticket,
            color: "#2563eb",
            background: "#dbeafe"
        },
        {
            title: "Active Tickets",
            value: activeTickets.length,
            icon: Clock,
            color: "#7c3aed",
            background: "#ede9fe"
        },
        {
            title: "Resolved Tickets",
            value: resolvedTickets.length,
            icon: CheckCircle,
            color: "#059669",
            background: "#d1fae5"
        },
        {
            title: "Total Visible Tickets",
            value: tickets.length,
            icon: AlertCircle,
            color: "#d97706",
            background: "#fef3c7"
        }
    ];

    return (
        <ProtectedRoute allowedRoles={["agent"]}>
            <DashboardLayout title="Agent Dashboard">

                <div className="mb-4">
                    <h5 className="fw-bold">
                        Welcome to Agent Portal
                    </h5>

                    <p className="text-muted">
                        Claim available tickets, manage your assigned
                        tickets and assist customers.
                    </p>
                </div>

                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        {success}
                    </div>
                )}

                {/* Dashboard Statistics */}
                <div className="row g-3 mb-4">
                    {stats.map((item) => {
                        const Icon = item.icon;

                        return (
                            <div
                                className="col-12 col-sm-6 col-xl-3"
                                key={item.title}
                            >
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body d-flex justify-content-between align-items-center">
                                        <div>
                                            <p className="text-muted mb-2">
                                                {item.title}
                                            </p>

                                            <h3 className="fw-bold mb-0">
                                                {loading ? "..." : item.value}
                                            </h3>
                                        </div>

                                        <div
                                            className="rounded-3 p-3"
                                            style={{
                                                background: item.background,
                                                color: item.color
                                            }}
                                        >
                                            <Icon size={25} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Ticket Management */}
                <div className="card border-0 shadow-sm">
                    <div className="card-body">

                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                            <div>
                                <h5 className="fw-bold mb-1">
                                    Ticket Management
                                </h5>

                                <small className="text-muted">
                                    Claim tickets or update your assigned tickets.
                                </small>
                            </div>

                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={loadTickets}
                                disabled={loading || busyId !== null}
                            >
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" />
                                <p className="text-muted mt-2">
                                    Loading tickets...
                                </p>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-5">
                                <Ticket
                                    size={40}
                                    className="text-muted mb-3"
                                />

                                <h6>No tickets available</h6>

                                <p className="text-muted">
                                    New support tickets will appear here.
                                </p>
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
                                            <th style={{ minWidth: "270px" }}>
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {tickets.map((ticket) => {
                                            const id = ticket.ticket_id;
                                            const available = isAvailable(ticket);
                                            const busy = busyId === id;

                                            return (
                                                <tr key={id}>
                                                    <td>#{id}</td>

                                                    <td className="fw-semibold">
                                                        {ticket.subject}
                                                    </td>

                                                    <td>
                                                        {ticket.priority}
                                                    </td>

                                                    <td>
                                                        <StatusBadge
                                                            status={ticket.status}
                                                        />
                                                    </td>

                                                    <td>
                                                        {available ? (
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    claimTicket(id)
                                                                }
                                                            >
                                                                {busy
                                                                    ? "Claiming..."
                                                                    : "Claim Ticket"}
                                                            </button>
                                                        ) : (
                                                            <div className="d-flex flex-wrap gap-2">

                                                                <select
                                                                    className="form-select form-select-sm"
                                                                    style={{
                                                                        maxWidth: "150px"
                                                                    }}
                                                                    value={
                                                                        selectedStatuses[id] ??
                                                                        ticket.status
                                                                    }
                                                                    onChange={(e) =>
                                                                        setSelectedStatuses(
                                                                            (previous) => ({
                                                                                ...previous,
                                                                                [id]: e.target.value
                                                                            })
                                                                        )
                                                                    }
                                                                    disabled={busy}
                                                                >
                                                                    {STATUS_OPTIONS.map(
                                                                        (status) => (
                                                                            <option
                                                                                key={status}
                                                                                value={status}
                                                                            >
                                                                                {status}
                                                                            </option>
                                                                        )
                                                                    )}
                                                                </select>

                                                                <button
                                                                    className="btn btn-sm btn-success"
                                                                    disabled={
                                                                        busy ||
                                                                        !selectedStatuses[id] ||
                                                                        selectedStatuses[id] === ticket.status
                                                                    }
                                                                    onClick={() =>
                                                                        updateTicketStatus(ticket)
                                                                    }
                                                                >
                                                                    {busy
                                                                        ? "Saving..."
                                                                        : "Update"}
                                                                </button>

                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={() =>
                                                                        router.push(
                                                                            `/agent/tickets/${id}`
                                                                        )
                                                                    }
                                                                    disabled={busy}
                                                                >
                                                                    View
                                                                    <ArrowRight
                                                                        size={14}
                                                                        className="ms-1"
                                                                    />
                                                                </button>

                                                            </div>
                                                        )}
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
