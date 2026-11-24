
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import DashboardLayout from "../../components/common/DashboardLayout";
import ProtectedRoute from "../../utils/ProtectedRoute";
import ticketService from "../../services/ticketService";
import agentService from "../../services/agentService";
import presenceService from "../../services/presenceService";
import StatusBadge from "../../components/tickets/StatusBadge";

const STATUS_COLORS = {
    open: "#3b82f6",
    "in progress": "#8b5cf6",
    pending: "#f59e0b",
    "on hold": "#64748b",
    resolved: "#10b981",
    closed: "#475569",
    reopened: "#ec4899"
};

const PRIORITY_COLORS = {
    low: "#0ea5e9",
    medium: "#f59e0b",
    high: "#f97316",
    critical: "#ef4444"
};

const normalize = (value) =>
    String(value || "").trim().toLowerCase().replaceAll("_", " ");

const isActive = (value) =>
    value === true || value === 1 || value === "1";

const getDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

function StatCard({ title, value, icon, color, subtitle }) {
    return (
        <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100 dashboard-stat">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start">
                        <div>
                            <p className="text-muted small fw-semibold mb-2">
                                {title}
                            </p>
                            <h2 className="fw-bold mb-1">{value}</h2>
                            <small className="text-muted">{subtitle}</small>
                        </div>
                        <div
                            className="stat-icon rounded-3 d-flex align-items-center justify-content-center"
                            style={{
                                background: `${color}18`,
                                color
                            }}
                        >
                            <i className={`bi ${icon} fs-4`}></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProgressRow({ label, count, total, color }) {
    const percentage = total
        ? Math.round((count / total) * 100)
        : 0;

    return (
        <div className="mb-3">
            <div className="d-flex justify-content-between mb-2">
                <span className="text-capitalize fw-semibold small">
                    {label}
                </span>
                <span className="text-muted small">
                    {count} ({percentage}%)
                </span>
            </div>

            <div
                className="progress"
                style={{ height: "9px", background: "#eef2f7" }}
            >
                <div
                    className="progress-bar"
                    role="progressbar"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color
                    }}
                    aria-valuenow={percentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                />
            </div>
        </div>
    );
}

export default function ManagerDashboard() {
    const [tickets, setTickets] = useState([]);
    const [agents, setAgents] = useState([]);
    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [selectedAgents, setSelectedAgents] = useState({});
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        try {
            setError("");

            const [
                ticketResult,
                agentResult,
                presenceResult
            ] = await Promise.all([
                ticketService.getAll(),
                agentService.getAll(),
                presenceService.getAll()
            ]);

            const ticketData = Array.isArray(ticketResult)
                ? ticketResult
                : ticketResult?.tickets || ticketResult?.data || [];

            const agentData = Array.isArray(agentResult)
                ? agentResult
                : agentResult?.agents || agentResult?.data || [];

            const presenceData = Array.isArray(presenceResult)
                ? presenceResult
                : presenceResult?.users || presenceResult?.data || [];

            setTickets(ticketData);
            setAgents(agentData);
            setUsers(presenceData);
        } catch (err) {
            console.error("Dashboard loading failed:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load dashboard data."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();

        const interval = setInterval(loadDashboard, 30000);

        return () => clearInterval(interval);
    }, [loadDashboard]);

    const assignTicket = async (ticketId) => {
        const agentId = selectedAgents[ticketId];

        if (!agentId) {
            alert("Please select an agent.");
            return;
        }

        try {
            setBusyId(ticketId);
            setError("");

            const response = await ticketService.assign(
                ticketId,
                agentId
            );

            alert(response.message || "Ticket assigned successfully.");

            setSelectedAgents((previous) => ({
                ...previous,
                [ticketId]: ""
            }));

            await loadDashboard();
        } catch (err) {
            console.error("Ticket assignment failed:", err);

            const message = err.response?.data?.message;

            alert(
                Array.isArray(message)
                    ? message.join(", ")
                    : message || err.message || "Unable to assign ticket."
            );
        } finally {
            setBusyId(null);
        }
    };

    const activeAgents = useMemo(
        () => agents.filter((agent) => isActive(agent.is_active)),
        [agents]
    );

    const onlineUsers = users.filter(
        (user) => normalize(user.presence_status) === "online"
    );

    const offlineUsers = users.filter(
        (user) => normalize(user.presence_status) !== "online"
    );

    const statusCounts = useMemo(() => {
        const statuses = [
            "open",
            "in progress",
            "pending",
            "on hold",
            "resolved",
            "closed",
            "reopened"
        ];

        return statuses.map((status) => ({
            label: status,
            count: tickets.filter(
                (ticket) => normalize(ticket.status) === status
            ).length,
            color: STATUS_COLORS[status]
        }));
    }, [tickets]);

    const priorityCounts = useMemo(() => {
        return ["low", "medium", "high", "critical"].map((priority) => ({
            label: priority,
            count: tickets.filter(
                (ticket) => normalize(ticket.priority) === priority
            ).length,
            color: PRIORITY_COLORS[priority]
        }));
    }, [tickets]);

    const weeklyData = useMemo(() => {
        const days = [];

        for (let offset = 6; offset >= 0; offset--) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - offset);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const created = tickets.filter((ticket) => {
                const createdAt = getDate(ticket.created_at);
                return createdAt &&
                    createdAt >= date &&
                    createdAt < nextDate;
            }).length;

            const resolved = tickets.filter((ticket) => {
                const resolvedAt = getDate(ticket.resolved_at);
                return resolvedAt &&
                    resolvedAt >= date &&
                    resolvedAt < nextDate;
            }).length;

            days.push({
                label: date.toLocaleDateString("en-IN", {
                    weekday: "short"
                }),
                created,
                resolved
            });
        }

        return days;
    }, [tickets]);

    const maxWeekly = Math.max(
        1,
        ...weeklyData.map((day) => Math.max(day.created, day.resolved))
    );

    const totalResolved = tickets.filter((ticket) =>
        ["resolved", "closed"].includes(normalize(ticket.status))
    ).length;

    const openCount = tickets.filter(
        (ticket) => normalize(ticket.status) === "open"
    ).length;

    const progressCount = tickets.filter(
        (ticket) => normalize(ticket.status) === "in progress"
    ).length;

    const pendingCount = tickets.filter(
        (ticket) => normalize(ticket.status) === "pending"
    ).length;

    const criticalCount = tickets.filter(
        (ticket) => normalize(ticket.priority) === "critical"
    ).length;

    const formatLastSeen = (value) => {
        if (!value) return "Never";

        const date = getDate(value);
        if (!date) return "Unavailable";

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardLayout title="Manager Dashboard">

                <style jsx>{`
                    .dashboard-stat {
                        border-radius: 14px;
                        transition: transform .2s ease, box-shadow .2s ease;
                    }
                    .dashboard-stat:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 10px 25px rgba(15, 23, 42, .09) !important;
                    }
                    .stat-icon {
                        width: 48px;
                        height: 48px;
                    }
                    .dashboard-card {
                        border: 0;
                        border-radius: 14px;
                        box-shadow: 0 3px 15px rgba(15, 23, 42, .05);
                    }
                    .chart-bar {
                        min-height: 5px;
                        border-radius: 5px 5px 0 0;
                        transition: height .3s ease;
                    }
                    .weekly-column {
                        height: 180px;
                        display: flex;
                        align-items: end;
                        justify-content: center;
                        gap: 5px;
                    }
                    .table > :not(caption) > * > * {
                        padding: 14px 12px;
                    }
                `}</style>

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">
                            Support Overview
                        </h4>
                        <p className="text-muted mb-0">
                            Monitor tickets, team activity and customer presence.
                        </p>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={loadDashboard}
                        disabled={loading}
                    >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        {loading ? "Refreshing..." : "Refresh Dashboard"}
                    </button>
                </div>

                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                {/* STAT CARDS */}
                <div className="row g-3 mb-4">
                    <StatCard
                        title="Total Tickets"
                        value={loading ? "..." : tickets.length}
                        icon="bi-ticket-perforated"
                        color="#2563eb"
                        subtitle="All registered tickets"
                    />

                    <StatCard
                        title="Open Tickets"
                        value={loading ? "..." : openCount}
                        icon="bi-folder2-open"
                        color="#0891b2"
                        subtitle="Waiting for support"
                    />

                    <StatCard
                        title="In Progress"
                        value={loading ? "..." : progressCount}
                        icon="bi-arrow-repeat"
                        color="#8b5cf6"
                        subtitle="Currently being handled"
                    />

                    <StatCard
                        title="Resolved / Closed"
                        value={loading ? "..." : totalResolved}
                        icon="bi-check-circle"
                        color="#059669"
                        subtitle="Completed tickets"
                    />
                </div>

                {/* CHARTS */}
                <div className="row g-4 mb-4">

                    {/* STATUS CHART */}
                    <div className="col-12 col-xl-6">
                        <div className="card dashboard-card h-100">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-1">
                                    Ticket Status
                                </h5>
                                <p className="text-muted small mb-4">
                                    Current distribution of support tickets.
                                </p>

                                {tickets.length === 0 ? (
                                    <p className="text-muted text-center py-5">
                                        No ticket data available.
                                    </p>
                                ) : (
                                    <>
                                        <div className="d-flex justify-content-center mb-4">
                                            <div
                                                style={{
                                                    width: 190,
                                                    height: 190,
                                                    borderRadius: "50%",
                                                    background: `conic-gradient(${statusCounts
                                                        .filter((item) => item.count > 0)
                                                        .map((item, index, items) => {
                                                            const previous = items
                                                                .slice(0, index)
                                                                .reduce((sum, entry) => sum + entry.count, 0);

                                                            const start = previous / tickets.length * 100;
                                                            const end = (previous + item.count) / tickets.length * 100;

                                                            return `${item.color} ${start}% ${end}%`;
                                                        }).join(", ")})`,
                                                    position: "relative"
                                                }}
                                            >
                                                <div
                                                    className="position-absolute top-50 start-50 translate-middle bg-white rounded-circle d-flex flex-column justify-content-center align-items-center"
                                                    style={{
                                                        width: 125,
                                                        height: 125
                                                    }}
                                                >
                                                    <h3 className="fw-bold mb-0">
                                                        {tickets.length}
                                                    </h3>
                                                    <small className="text-muted">
                                                        Tickets
                                                    </small>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row g-3">
                                            {statusCounts
                                                .filter((item) => item.count > 0)
                                                .map((item) => (
                                                    <div className="col-6" key={item.label}>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span
                                                                className="rounded-circle"
                                                                style={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    background: item.color
                                                                }}
                                                            />
                                                            <span className="text-capitalize small">
                                                                {item.label}
                                                            </span>
                                                            <strong className="ms-auto small">
                                                                {item.count}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PRIORITY CHART */}
                    <div className="col-12 col-xl-6">
                        <div className="card dashboard-card h-100">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-1">
                                    Ticket Priority
                                </h5>
                                <p className="text-muted small mb-4">
                                    Distribution by urgency.
                                </p>

                                {priorityCounts.map((item) => (
                                    <ProgressRow
                                        key={item.label}
                                        label={item.label}
                                        count={item.count}
                                        total={tickets.length}
                                        color={item.color}
                                    />
                                ))}

                                <div className="alert alert-light border mt-4 mb-0">
                                    <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                                    <strong>{criticalCount}</strong> critical
                                    priority ticket(s) need attention.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WEEKLY CHART */}
                    <div className="col-12">
                        <div className="card dashboard-card">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-1">
                                    Weekly Ticket Activity
                                </h5>
                                <p className="text-muted small mb-4">
                                    Tickets created and resolved over the last seven days.
                                </p>

                                <div className="d-flex gap-4 mb-3">
                                    <span className="small">
                                        <span
                                            className="d-inline-block rounded me-2"
                                            style={{
                                                width: 10,
                                                height: 10,
                                                background: "#3b82f6"
                                            }}
                                        />
                                        Created
                                    </span>

                                    <span className="small">
                                        <span
                                            className="d-inline-block rounded me-2"
                                            style={{
                                                width: 10,
                                                height: 10,
                                                background: "#10b981"
                                            }}
                                        />
                                        Resolved
                                    </span>
                                </div>

                                <div className="row g-2">
                                    {weeklyData.map((day) => (
                                        <div className="col" key={day.label}>
                                            <div className="weekly-column">
                                                <div
                                                    className="chart-bar"
                                                    title={`Created: ${day.created}`}
                                                    style={{
                                                        width: "28%",
                                                        height: `${Math.max(5, day.created / maxWeekly * 100)}%`,
                                                        background: "#3b82f6"
                                                    }}
                                                />
                                                <div
                                                    className="chart-bar"
                                                    title={`Resolved: ${day.resolved}`}
                                                    style={{
                                                        width: "28%",
                                                        height: `${Math.max(5, day.resolved / maxWeekly * 100)}%`,
                                                        background: "#10b981"
                                                    }}
                                                />
                                            </div>

                                            <div className="text-center text-muted small mt-2">
                                                {day.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PRESENCE */}
                <div className="card dashboard-card mb-4">
                    <div className="card-body p-4">
                        <div className="d-flex justify-content-between flex-wrap gap-2 mb-4">
                            <div>
                                <h5 className="fw-bold mb-1">
                                    Team & User Presence
                                </h5>
                                <p className="text-muted small mb-0">
                                    Live availability of customers, agents and managers.
                                </p>
                            </div>

                            <span className="badge text-bg-success align-self-start">
                                <i className="bi bi-circle-fill me-1"></i>
                                Presence Monitor
                            </span>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-12 col-md-4">
                                <div className="rounded-3 p-3 bg-success bg-opacity-10">
                                    <small className="text-muted">Online Users</small>
                                    <h3 className="fw-bold text-success mb-0">
                                        {loading ? "..." : onlineUsers.length}
                                    </h3>
                                </div>
                            </div>

                            <div className="col-12 col-md-4">
                                <div className="rounded-3 p-3 bg-secondary bg-opacity-10">
                                    <small className="text-muted">Offline Users</small>
                                    <h3 className="fw-bold text-secondary mb-0">
                                        {loading ? "..." : offlineUsers.length}
                                    </h3>
                                </div>
                            </div>

                            <div className="col-12 col-md-4">
                                <div className="rounded-3 p-3 bg-primary bg-opacity-10">
                                    <small className="text-muted">Active Agents</small>
                                    <h3 className="fw-bold text-primary mb-0">
                                        {loading ? "..." : activeAgents.length}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="table align-middle table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Availability</th>
                                        <th>Last Seen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.user_id}>
                                            <td className="fw-semibold">
                                                {user.full_name}
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border text-capitalize">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                {normalize(user.presence_status) === "online" ? (
                                                    <span className="badge text-bg-success">
                                                        Online
                                                    </span>
                                                ) : (
                                                    <span className="badge text-bg-secondary">
                                                        Offline
                                                    </span>
                                                )}
                                            </td>
                                            <td className="small text-muted">
                                                {formatLastSeen(user.last_seen_at)}
                                            </td>
                                        </tr>
                                    ))}

                                    {!loading && users.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted py-4">
                                                No presence information available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* TICKET MANAGEMENT */}
                <div className="card dashboard-card mb-4">
                    <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                            <div>
                                <h5 className="fw-bold mb-1">
                                    Ticket Management
                                </h5>
                                <p className="text-muted small mb-0">
                                    Assign tickets to your support agents.
                                </p>
                            </div>

                            <span className="badge bg-primary-subtle text-primary">
                                {tickets.length} Total
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Ticket</th>
                                        <th>Subject</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th style={{ minWidth: 260 }}>
                                            Assign Agent
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {tickets.map((ticket) => (
                                        <tr key={ticket.ticket_id}>
                                            <td className="fw-semibold">
                                                #{ticket.ticket_id}
                                            </td>

                                            <td>{ticket.subject}</td>

                                            <td>
                                                <span className={`badge ${
                                                    normalize(ticket.priority) === "critical"
                                                        ? "text-bg-danger"
                                                        : normalize(ticket.priority) === "high"
                                                        ? "text-bg-warning"
                                                        : normalize(ticket.priority) === "medium"
                                                        ? "text-bg-info"
                                                        : "text-bg-secondary"
                                                }`}>
                                                    {ticket.priority}
                                                </span>
                                            </td>

                                            <td>
                                                <StatusBadge status={ticket.status} />
                                            </td>

                                            <td>
                                                <div className="d-flex gap-2">
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={selectedAgents[ticket.ticket_id] || ""}
                                                        onChange={(event) =>
                                                            setSelectedAgents((previous) => ({
                                                                ...previous,
                                                                [ticket.ticket_id]: event.target.value
                                                            }))
                                                        }
                                                        disabled={
                                                            busyId === ticket.ticket_id ||
                                                            activeAgents.length === 0
                                                        }
                                                    >
                                                        <option value="">
                                                            Select agent
                                                        </option>

                                                        {activeAgents.map((agent) => (
                                                            <option
                                                                key={agent.user_id}
                                                                value={agent.user_id}
                                                            >
                                                                {agent.full_name}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        disabled={
                                                            busyId === ticket.ticket_id ||
                                                            !selectedAgents[ticket.ticket_id]
                                                        }
                                                        onClick={() => assignTicket(ticket.ticket_id)}
                                                    >
                                                        {busyId === ticket.ticket_id
                                                            ? "..."
                                                            : "Assign"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {!loading && tickets.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-5">
                                                No tickets found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!loading && activeAgents.length === 0 && (
                            <div className="alert alert-warning mb-0">
                                No active agents found. Create an active agent before assigning tickets.
                            </div>
                        )}
                    </div>
                </div>

            </DashboardLayout>
        </ProtectedRoute>
    );
}
