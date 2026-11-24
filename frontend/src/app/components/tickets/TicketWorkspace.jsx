
"use client";

import { useCallback, useEffect, useState } from "react";

import ticketService from "../../services/ticketService";
import conversationService from "../../services/conversationService";
import agentService from "../../services/agentService";
import StatusBadge from "./StatusBadge";

const STATUS_OPTIONS = [
    "Open",
    "In Progress",
    "On Hold",
    "Pending",
    "Resolved",
    "Closed",
    "Reopened"
];

const ACTIVITY_ICONS = {
    CREATED: "bi-plus-circle",
    ASSIGNED: "bi-person-check",
    REASSIGNED: "bi-arrow-left-right",
    CLAIMED: "bi-hand-index",
    STATUS_CHANGED: "bi-arrow-repeat",
    ON_HOLD: "bi-pause-circle",
    RESOLVED: "bi-check-circle",
    CLOSED: "bi-lock",
    PRIORITY_CHANGED: "bi-flag",
    COMMENT_ADDED: "bi-chat",
    MESSAGE_SENT: "bi-envelope",
    REOPEN_REQUESTED: "bi-arrow-counterclockwise",
    REOPEN_APPROVED: "bi-check-circle",
    REOPEN_REJECTED: "bi-x-circle",
    DUPLICATE_DETECTED: "bi-files"
};

export default function TicketWorkspace({ ticketId, role }) {
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [activities, setActivities] = useState([]);
    const [agents, setAgents] = useState([]);

    const [message, setMessage] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);

    const [status, setStatus] = useState("");
    const [agentId, setAgentId] = useState("");

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState("");

    const [currentUserId, setCurrentUserId] = useState(null);

    const [reopenReason, setReopenReason] = useState("");
    const [reopenRequests, setReopenRequests] = useState([]);
    const [submittingReopen, setSubmittingReopen] = useState(false);

    // ==========================================
    // CURRENT USER
    // ==========================================

    useEffect(() => {
        try {
            const storedUser = JSON.parse(
                localStorage.getItem("user") || "{}"
            );

            setCurrentUserId(
                storedUser.user_id ?? storedUser.sub ?? null
            );
        } catch (err) {
            console.error("Unable to read current user:", err);
        }
    }, []);

    // ==========================================
    // NORMALIZE API RESPONSES
    // ==========================================

    const normalizeList = (response, key) => {
        if (Array.isArray(response)) return response;

        if (Array.isArray(response?.[key])) {
            return response[key];
        }

        if (Array.isArray(response?.data)) {
            return response.data;
        }

        return [];
    };

    const normalizeMessages = (response) => {
        return normalizeList(response, "messages");
    };

    const normalizeTicket = (response) => {
        return (
            response?.ticket ||
            response?.data?.ticket ||
            response?.data ||
            response
        );
    };

    // ==========================================
    // LOAD MESSAGES
    // ==========================================

    const loadMessages = useCallback(async () => {
        try {
            const response =
                await conversationService.getMessages(ticketId);

            const list = normalizeMessages(response);

            setMessages(
                role === "customer"
                    ? list.filter(
                        (item) => item.message_type !== "private"
                    )
                    : list
            );
        } catch (err) {
            console.error("Unable to refresh messages:", err);
        }
    }, [ticketId, role]);

    // ==========================================
    // REFRESH TICKET STATUS
    // ==========================================

    const refreshTicket = useCallback(async () => {
        try {
            const result = await ticketService.getById(ticketId);
            const ticketData = normalizeTicket(result);

            setTicket(ticketData);
            setStatus(ticketData.status || "");
        } catch (err) {
            console.error("Unable to refresh ticket:", err);
        }
    }, [ticketId]);

    // ==========================================
    // LOAD CUSTOMER REOPEN REQUESTS
    // ==========================================

    const loadMyReopenRequests = useCallback(async () => {
        if (role !== "customer") return;

        try {
            const result =
                await ticketService.getMyReopenRequests();

            setReopenRequests(
                Array.isArray(result)
                    ? result
                    : Array.isArray(result?.data)
                        ? result.data
                        : []
            );
        } catch (err) {
            console.error(
                "Unable to load reopen requests:",
                err
            );
        }
    }, [role]);

    // ==========================================
    // LOAD COMPLETE WORKSPACE
    // ==========================================

    const loadWorkspace = useCallback(async () => {
        try {
            setError("");

            const [ticketResult, messageResult] =
                await Promise.all([
                    ticketService.getById(ticketId),
                    conversationService.getMessages(ticketId)
                ]);

            const ticketData = normalizeTicket(ticketResult);

            setTicket(ticketData);
            setStatus(ticketData.status || "");

            const messageList = normalizeMessages(messageResult);

            setMessages(
                role === "customer"
                    ? messageList.filter(
                        (item) => item.message_type !== "private"
                    )
                    : messageList
            );

            try {
                const activityResult =
                    await ticketService.getActivities(ticketId);

                setActivities(
                    normalizeList(activityResult, "activities")
                );
            } catch (err) {
                console.error("Unable to load activities:", err);
                setActivities([]);
            }

            if (role === "manager") {
                try {
                    const agentResult = await agentService.getAll();

                    setAgents(
                        normalizeList(agentResult, "agents")
                    );
                } catch (err) {
                    console.error("Unable to load agents:", err);
                    setAgents([]);
                }
            }

            if (role === "customer") {
                await loadMyReopenRequests();
            }
        } catch (err) {
            console.error("Workspace error:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load ticket workspace."
            );
        } finally {
            setLoading(false);
        }
    }, [ticketId, role, loadMyReopenRequests]);

    // ==========================================
    // INITIAL LOAD AND AUTOMATIC REFRESH
    // ==========================================

    useEffect(() => {
        if (!ticketId) return;

        setLoading(true);
        loadWorkspace();

        const interval = setInterval(() => {
            loadMessages();
            refreshTicket();
        }, 5000);

        return () => clearInterval(interval);
    }, [
        ticketId,
        loadWorkspace,
        loadMessages,
        refreshTicket
    ]);

    // ==========================================
    // SEND MESSAGE
    // ==========================================

    const handleSendMessage = async (e) => {
        e.preventDefault();

        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
            setError("Please enter a message.");
            return;
        }

        try {
            setSending(true);
            setError("");

            await conversationService.sendMessage(
                ticketId,
                trimmedMessage,
                role === "customer" ? false : isPrivate
            );

            setMessage("");

            await Promise.all([
                loadMessages(),
                refreshTicket()
            ]);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to send message."
            );
        } finally {
            setSending(false);
        }
    };

    // ==========================================
    // MANAGER: UPDATE STATUS
    // ==========================================

    const handleStatusUpdate = async () => {
        if (!status) return;

        try {
            setUpdating(true);
            setError("");

            await ticketService.updateStatus(ticketId, status);

            await loadWorkspace();

            alert("Ticket status updated successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update ticket status."
            );
        } finally {
            setUpdating(false);
        }
    };

    // ==========================================
    // MANAGER: ASSIGN AGENT
    // ==========================================

    const handleAssign = async () => {
        if (!agentId) {
            alert("Please select an agent.");
            return;
        }

        try {
            setAssigning(true);
            setError("");

            await ticketService.assign(
                ticketId,
                Number(agentId)
            );

            setAgentId("");

            await loadWorkspace();

            alert("Ticket assigned successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to assign ticket."
            );
        } finally {
            setAssigning(false);
        }
    };

    // ==========================================
    // MANAGER: RESUME ON HOLD TICKET
    // ==========================================

    const handleResumeTicket = async () => {
        if (
            !window.confirm(
                "Are you sure you want to resume this ticket?"
            )
        ) {
            return;
        }

        try {
            setUpdating(true);
            setError("");

            await ticketService.resume(ticketId);

            await loadWorkspace();

            alert("Ticket resumed successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to resume ticket."
            );
        } finally {
            setUpdating(false);
        }
    };

    // ==========================================
    // CUSTOMER: REQUEST REOPEN
    // ==========================================

    const handleRequestReopen = async (e) => {
        e.preventDefault();

        const reason = reopenReason.trim();

        if (reason.length < 5) {
            setError(
                "Please enter a reopening reason with at least 5 characters."
            );
            return;
        }

        try {
            setSubmittingReopen(true);
            setError("");

            await ticketService.requestReopen(ticketId, reason);

            setReopenReason("");

            await Promise.all([
                loadMyReopenRequests(),
                loadWorkspace()
            ]);

            alert(
                "Your reopening request has been submitted to the manager."
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to submit reopening request."
            );
        } finally {
            setSubmittingReopen(false);
        }
    };

    // ==========================================
    // DATE FORMAT
    // ==========================================

    const formatDate = (date) => {
        if (!date) return "Date unavailable";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return "Date unavailable";
        }

        return parsed.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" />

                <p className="text-muted mt-2">
                    Loading ticket workspace...
                </p>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="alert alert-warning">
                {error || "Ticket not found."}

                <button
                    type="button"
                    className="btn btn-sm btn-outline-primary ms-3"
                    onClick={loadWorkspace}
                >
                    Retry
                </button>
            </div>
        );
    }

    // ==========================================
    // MESSAGE VISIBILITY
    // ==========================================

    const canSendPrivate =
        role === "agent" || role === "manager";

    const visibleMessages = messages.filter((item) => {
        return !(
            role === "customer" &&
            item.message_type === "private"
        );
    });

    // ==========================================
    // UI
    // ==========================================

    return (
        <div>
            {/* ERROR MESSAGE */}

            {error && (
                <div className="alert alert-danger d-flex justify-content-between align-items-center">
                    <span>{error}</span>

                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setError("")}
                    />
                </div>
            )}

            {/* TICKET DETAILS */}

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between flex-wrap gap-3">
                        <div>
                            <p className="text-muted mb-1">
                                Ticket #{ticket.ticket_id}
                            </p>

                            <h4 className="fw-bold">
                                {ticket.subject}
                            </h4>
                        </div>

                        <StatusBadge status={ticket.status} />
                    </div>

                    <hr />

                    <p className="text-muted">
                        {ticket.description}
                    </p>

                    <div className="row g-3 mt-2">
                        <div className="col-md-4">
                            <small className="text-muted">
                                Priority
                            </small>

                            <p className="fw-semibold mb-0">
                                {ticket.priority}
                            </p>
                        </div>

                        <div className="col-md-4">
                            <small className="text-muted">
                                Customer
                            </small>

                            <p className="fw-semibold mb-0">
                                {ticket.customer_name ||
                                    ticket.full_name ||
                                    "Customer"}
                            </p>
                        </div>

                        <div className="col-md-4">
                            <small className="text-muted">
                                Category
                            </small>

                            <p className="fw-semibold mb-0">
                                {ticket.category || "General"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CUSTOMER: REQUEST REOPEN */}

            {role === "customer" &&
                ["Resolved", "Closed"].includes(ticket.status) && (
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                            <h5 className="fw-bold mb-2">
                                <i className="bi bi-arrow-counterclockwise text-primary me-2"></i>
                                Reopen Ticket
                            </h5>

                            <p className="text-muted">
                                If your issue is not resolved, submit a
                                reopening request with a reason. The
                                manager will review it.
                            </p>

                            {reopenRequests.some(
                                (item) =>
                                    Number(item.ticket_id) ===
                                        Number(ticketId) &&
                                    item.status === "Pending"
                            ) ? (
                                <div className="alert alert-warning mb-0">
                                    <i className="bi bi-clock me-2"></i>
                                    Your reopening request is pending
                                    manager approval.
                                </div>
                            ) : (
                                <form onSubmit={handleRequestReopen}>
                                    <label className="form-label fw-semibold">
                                        Reason for reopening
                                    </label>

                                    <textarea
                                        className="form-control mb-3"
                                        rows="3"
                                        placeholder="Explain why this ticket needs to be reopened..."
                                        value={reopenReason}
                                        onChange={(e) =>
                                            setReopenReason(e.target.value)
                                        }
                                        required
                                    />

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={
                                            submittingReopen ||
                                            reopenReason.trim().length < 5
                                        }
                                    >
                                        <i className="bi bi-arrow-counterclockwise me-2"></i>

                                        {submittingReopen
                                            ? "Submitting..."
                                            : "Request Reopen"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

            {/* MANAGER CONTROLS */}

            {role === "manager" && (
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-4">
                        <h5 className="fw-bold mb-3">
                            Manage Ticket
                        </h5>

                        <div className="row g-3">
                            <div className="col-md-5">
                                <label className="form-label">
                                    Update Status
                                </label>

                                <select
                                    className="form-select"
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(e.target.value)
                                    }
                                >
                                    {STATUS_OPTIONS.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-2 d-flex align-items-end">
                                <button
                                    type="button"
                                    className="btn btn-primary w-100"
                                    onClick={handleStatusUpdate}
                                    disabled={
                                        updating ||
                                        status === ticket.status
                                    }
                                >
                                    {updating ? "Updating..." : "Update"}
                                </button>
                            </div>

                            <div className="col-md-5">
                                <label className="form-label">
                                    Assign Agent
                                </label>

                                <div className="d-flex gap-2">
                                    <select
                                        className="form-select"
                                        value={agentId}
                                        onChange={(e) =>
                                            setAgentId(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            Select Agent
                                        </option>

                                        {agents.map((agent) => (
                                            <option
                                                key={agent.user_id}
                                                value={agent.user_id}
                                            >
                                                {agent.full_name}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={handleAssign}
                                        disabled={!agentId || assigning}
                                    >
                                        {assigning ? "Assigning..." : "Assign"}
                                    </button>
                                </div>
                            </div>

                            {/* MANUAL RESUME */}

                            {ticket.status === "On Hold" && (
                                <div className="col-12">
                                    <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-3 mb-0">
                                        <div>
                                            <strong>
                                                <i className="bi bi-pause-circle me-2"></i>
                                                Ticket is On Hold
                                            </strong>

                                            <p className="mb-0 small">
                                                Review the customer's latest
                                                messages before manually
                                                resuming this ticket.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={handleResumeTicket}
                                            disabled={updating}
                                        >
                                            <i className="bi bi-play-circle me-2"></i>

                                            {updating
                                                ? "Resuming..."
                                                : "Resume Ticket"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVITY TIMELINE */}

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">
                        <i className="bi bi-clock-history me-2 text-primary"></i>
                        Ticket Activity
                    </h5>

                    {activities.length === 0 ? (
                        <p className="text-muted mb-0">
                            No activity history available.
                        </p>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {activities.map((activity, index) => (
                                <div
                                    key={
                                        activity.activity_id ||
                                        `${activity.activity_type}-${index}`
                                    }
                                    className="d-flex gap-3"
                                >
                                    <div className="text-primary fs-5">
                                        <i
                                            className={`bi ${
                                                ACTIVITY_ICONS[
                                                    activity.activity_type
                                                ] || "bi-circle"
                                            }`}
                                        ></i>
                                    </div>

                                    <div className="flex-grow-1 border-bottom pb-3">
                                        <strong>
                                            {(activity.activity_type || "ACTIVITY")
                                                .replaceAll("_", " ")}
                                        </strong>

                                        <p className="text-muted mb-1">
                                            {activity.description ||
                                                activity.details ||
                                                activity.message ||
                                                "Ticket activity recorded."}
                                        </p>

                                        <small className="text-muted">
                                            {formatDate(activity.created_at)}
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* TICKET CONVERSATION */}

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <div>
                            <h5 className="fw-bold mb-1">
                                <i className="bi bi-chat-dots me-2 text-primary"></i>
                                Ticket Conversation
                            </h5>

                            <small className="text-muted">
                                Messages refresh automatically every 5 seconds.
                            </small>
                        </div>

                        <span className="badge text-bg-primary">
                            {visibleMessages.length} Messages
                        </span>
                    </div>

                    {/* MESSAGE LIST */}

                    <div
                        className="bg-light rounded p-3 mb-3"
                        style={{
                            minHeight: "250px",
                            maxHeight: "450px",
                            overflowY: "auto"
                        }}
                    >
                        {visibleMessages.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <i className="bi bi-chat-left-text fs-2"></i>

                                <p className="mb-0 mt-2">
                                    No messages yet. Start the conversation.
                                </p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {visibleMessages.map((item, index) => {
                                    const senderId =
                                        item.sender_id ?? item.user_id;

                                    const isOwnMessage =
                                        currentUserId !== null &&
                                        String(senderId) ===
                                            String(currentUserId);

                                    return (
                                        <div
                                            key={
                                                item.conversation_id ||
                                                item.message_id ||
                                                index
                                            }
                                            className={`d-flex ${
                                                isOwnMessage
                                                    ? "justify-content-end"
                                                    : "justify-content-start"
                                            }`}
                                        >
                                            <div
                                                className={`rounded p-3 ${
                                                    isOwnMessage
                                                        ? "bg-primary text-white"
                                                        : "bg-white border"
                                                }`}
                                                style={{
                                                    maxWidth: "80%",
                                                    minWidth: "180px"
                                                }}
                                            >
                                                <div className="d-flex justify-content-between gap-3 align-items-center mb-1">
                                                    <strong className="small">
                                                        {item.sender_name ||
                                                            item.full_name ||
                                                            "User"}
                                                    </strong>

                                                    {item.message_type === "private" && (
                                                        <span className="badge text-bg-warning">
                                                            Private
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mb-1 text-break">
                                                    {item.message}
                                                </p>

                                                <small
                                                    className={
                                                        isOwnMessage
                                                            ? "text-white-50"
                                                            : "text-muted"
                                                    }
                                                >
                                                    {formatDate(item.created_at)}
                                                </small>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* MESSAGE FORM */}

                    <form onSubmit={handleSendMessage}>
                        {canSendPrivate && (
                            <div className="form-check mb-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="privateMessage"
                                    checked={isPrivate}
                                    onChange={(e) =>
                                        setIsPrivate(e.target.checked)
                                    }
                                />

                                <label
                                    className="form-check-label"
                                    htmlFor="privateMessage"
                                >
                                    <i className="bi bi-lock me-1"></i>
                                    Send private message to manager/agent team
                                </label>
                            </div>
                        )}

                        <div className="input-group">
                            <textarea
                                className="form-control"
                                rows="2"
                                placeholder="Type your message..."
                                value={message}
                                onChange={(e) =>
                                    setMessage(e.target.value)
                                }
                            />

                            <button
                                type="submit"
                                className="btn btn-primary px-4"
                                disabled={sending || !message.trim()}
                            >
                                <i className="bi bi-send me-2"></i>

                                {sending ? "Sending..." : "Send"}
                            </button>
                        </div>

                        {role === "customer" && (
                            <small className="text-muted d-block mt-2">
                                Your messages are visible to the assigned support team.
                            </small>
                        )}

                        {canSendPrivate && (
                            <small className="text-muted d-block mt-2">
                                Private messages are visible only to authorized support-team members.
                            </small>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
