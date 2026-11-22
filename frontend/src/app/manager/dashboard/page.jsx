

"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "../../components/common/DashboardLayout";
import ProtectedRoute from "../../utils/ProtectedRoute";
import ticketService from "../../services/ticketService";
import agentService from "../../services/agentService";
import presenceService from "../../services/presenceService";
import StatusBadge from "../../components/tickets/StatusBadge";

export default function ManagerDashboard() {
    const [tickets, setTickets] = useState([]);
    const [agents, setAgents] = useState([]);
    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [selectedAgents, setSelectedAgents] = useState({});
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");

    const loadDashboard = async () => {
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
                : ticketResult.tickets || ticketResult.data || [];

            const agentData = Array.isArray(agentResult)
                ? agentResult
                : agentResult.agents || agentResult.data || [];

            const presenceData = Array.isArray(presenceResult)
                ? presenceResult
                : presenceResult.users || presenceResult.data || [];

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
    };

    useEffect(() => {
        loadDashboard();

        // Refresh presence and dashboard data every 30 seconds
        const interval = setInterval(() => {
            loadDashboard();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

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

            alert(
                response.message ||
                "Ticket assigned successfully."
            );

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
                    : message || err.message ||
                      "Unable to assign ticket."
            );

        } finally {
            setBusyId(null);
        }
    };

    const normalizeStatus = (status) =>
        String(status || "").trim().toLowerCase();

    const isOnline = (user) =>
        String(user.presence_status || "").toLowerCase() === "online";

    const onlineUsers = users.filter(isOnline);
    const offlineUsers = users.filter((user) => !isOnline(user));

    const stats = [
        {
            label: "Total Tickets",
            value: tickets.length
        },
        {
            label: "Open Tickets",
            value: tickets.filter(
                (ticket) =>
                    normalizeStatus(ticket.status) === "open"
            ).length
        },
        {
            label: "In Progress",
            value: tickets.filter(
                (ticket) =>
                    ["in progress", "in_progress"].includes(
                        normalizeStatus(ticket.status)
                    )
            ).length
        },
        {
            label: "Total Agents",
            value: agents.length
        }
    ];

    const formatLastSeen = (date) => {
        if (!date) return "Never";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Unavailable";
        }

        return parsedDate.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getActiveAgents = () =>
        agents.filter(
            (agent) =>
                agent.is_active === 1 ||
                agent.is_active === true ||
                agent.is_active === "1"
        );

    return (
        <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardLayout title="Manager Dashboard">

                {/* TICKET STATISTICS */}
                <div className="row g-3 mb-4">
                    {stats.map((item) => (
                        <div
                            className="col-12 col-sm-6 col-xl-3"
                            key={item.label}
                        >
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <p className="text-muted mb-2">
                                        {item.label}
                                    </p>

                                    <h3 className="fw-bold mb-0">
                                        {loading ? "..." : item.value}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* USER PRESENCE */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                            <div>
                                <h5 className="fw-bold mb-1">
                                    User Presence
                                </h5>

                                <p className="text-muted mb-0">
                                    Monitor customers, agents and managers.
                                </p>
                            </div>

                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={loadDashboard}
                                disabled={loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>
                                Refresh
                            </button>
                        </div>

                        <div className="row g-3 mb-4">

                            <div className="col-md-4">
                                <div className="p-3 rounded bg-success bg-opacity-10">
                                    <small className="text-muted">
                                        Online Users
                                    </small>

                                    <h3 className="fw-bold text-success mb-0">
                                        {loading ? "..." : onlineUsers.length}
                                    </h3>
                                </div>
                            </div>

                            <div className="col-md-4">
                                <div className="p-3 rounded bg-secondary bg-opacity-10">
                                    <small className="text-muted">
                                        Offline Users
                                    </small>

                                    <h3 className="fw-bold text-secondary mb-0">
                                        {loading ? "..." : offlineUsers.length}
                                    </h3>
                                </div>
                            </div>

                            <div className="col-md-4">
                                <div className="p-3 rounded bg-primary bg-opacity-10">
                                    <small className="text-muted">
                                        Total Users
                                    </small>

                                    <h3 className="fw-bold text-primary mb-0">
                                        {loading ? "..." : users.length}
                                    </h3>
                                </div>
                            </div>

                        </div>

                        {loading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center text-muted py-4">
                                No user presence information available.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table align-middle">
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
                                                    <span className="badge text-bg-light border text-dark text-capitalize">
                                                        {user.role}
                                                    </span>
                                                </td>

                                                <td>
                                                    {isOnline(user) ? (
                                                        <span className="badge text-bg-success">
                                                            <i className="bi bi-circle-fill me-1"></i>
                                                            Online
                                                        </span>
                                                    ) : (
                                                        <span className="badge text-bg-secondary">
                                                            <i className="bi bi-circle-fill me-1"></i>
                                                            Offline
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="text-muted small">
                                                    {formatLastSeen(user.last_seen_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* TICKET MANAGEMENT */}
                <div className="card border-0 shadow-sm">
                    <div className="card-body">

                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                            <h5 className="fw-bold mb-0">
                                Ticket Management
                            </h5>

                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={loadDashboard}
                                disabled={loading || busyId !== null}
                            >
                                Refresh Tickets
                            </button>
                        </div>

                        {error && (
                            <div className="alert alert-danger">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" />
                                <p className="text-muted mt-2">
                                    Loading tickets...
                                </p>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-5">
                                <h6>No tickets found</h6>
                                <p className="text-muted mb-0">
                                    Customer tickets will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Subject</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                            <th style={{ minWidth: "280px" }}>
                                                Assign Agent
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {tickets.map((ticket) => (
                                            <tr key={ticket.ticket_id}>
                                                <td>
                                                    #{ticket.ticket_id}
                                                </td>

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
                                                    <div className="d-flex gap-2">
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={
                                                                selectedAgents[ticket.ticket_id] || ""
                                                            }
                                                            onChange={(e) =>
                                                                setSelectedAgents(
                                                                    (previous) => ({
                                                                        ...previous,
                                                                        [ticket.ticket_id]:
                                                                            e.target.value
                                                                    })
                                                                )
                                                            }
                                                            disabled={
                                                                busyId === ticket.ticket_id ||
                                                                getActiveAgents().length === 0
                                                            }
                                                        >
                                                            <option value="">
                                                                Select agent
                                                            </option>

                                                            {getActiveAgents().map((agent) => (
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
                                                            onClick={() =>
                                                                assignTicket(ticket.ticket_id)
                                                            }
                                                        >
                                                            {busyId === ticket.ticket_id
                                                                ? "Assigning..."
                                                                : "Assign"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!loading && getActiveAgents().length === 0 && (
                            <div className="alert alert-warning mt-3 mb-0">
                                No active agents found. Please create an active
                                agent before assigning tickets.
                            </div>
                        )}
                    </div>
                </div>

            </DashboardLayout>
        </ProtectedRoute>
    );
}
