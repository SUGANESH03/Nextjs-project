
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
    const [clarifications, setClarifications] = useState([]);

    const [message, setMessage] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);

    const [question, setQuestion] = useState("");
    const [responses, setResponses] = useState({});

    const [status, setStatus] = useState("");
    const [agentId, setAgentId] = useState("");

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [respondingId, setRespondingId] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState("");

    const [reopenReason, setReopenReason] = useState("");
const [reopenRequests, setReopenRequests] = useState([]);
const [submittingReopen, setSubmittingReopen] = useState(false);

    const normalizeList = (response, key) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.[key])) return response[key];
        if (Array.isArray(response?.data)) return response.data;
        return [];
    };

    const normalizeMessages = (response) => {
        return normalizeList(response, "messages");
    };

    // LOAD MESSAGES
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

    // LOAD CLARIFICATIONS
    const loadClarifications = useCallback(async () => {
        try {
            const result =
                await ticketService.getClarifications(ticketId);

            setClarifications(
                normalizeList(result, "clarifications")
            );
        } catch (err) {
            console.error("Unable to load clarifications:", err);
        }
    }, [ticketId]);

    // LOAD COMPLETE WORKSPACE
    const loadWorkspace = useCallback(async () => {
        try {
            setError("");

            const [ticketResult, messageResult] =
                await Promise.all([
                    ticketService.getById(ticketId),
                    conversationService.getMessages(ticketId)
                ]);

            const ticketData =
                ticketResult?.ticket ||
                ticketResult?.data?.ticket ||
                ticketResult?.data ||
                ticketResult;

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

            try {
                await loadClarifications();
            } catch (err) {
                console.error("Clarification loading failed:", err);
            }

            if (role === "manager") {
                try {
                    const agentResult = await agentService.getAll();

                    setAgents(
                        normalizeList(agentResult, "agents")
                    );
                } catch (err) {
                    console.error("Unable to load agents:", err);
                }
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
    }, [ticketId, role, loadClarifications]);

    // INITIAL LOAD AND AUTOMATIC REFRESH
    useEffect(() => {
        if (!ticketId) return;

        setLoading(true);
        loadWorkspace();

        const interval = setInterval(() => {
            loadMessages();
            loadClarifications();
        }, 5000);

        return () => clearInterval(interval);
    }, [
        ticketId,
        loadWorkspace,
        loadMessages,
        loadClarifications
    ]);

    // SEND MESSAGE
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
            await loadMessages();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to send message."
            );
        } finally {
            setSending(false);
        }
    };

    // AGENT: REQUEST CLARIFICATION
    const handleRequestClarification = async (e) => {
        e.preventDefault();

        const trimmedQuestion = question.trim();

        if (!trimmedQuestion) {
            setError("Please enter a clarification question.");
            return;
        }

        try {
            setRequesting(true);
            setError("");

            await ticketService.requestClarification(
                ticketId,
                trimmedQuestion
            );

            setQuestion("");

            await loadWorkspace();

            alert("Clarification request submitted successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to request clarification."
            );
        } finally {
            setRequesting(false);
        }
    };

    // CUSTOMER: RESPOND TO CLARIFICATION
    const handleClarificationResponse = async (clarificationId) => {
        const responseText = String(
            responses[clarificationId] || ""
        ).trim();

        if (!responseText) {
            setError("Please enter your clarification response.");
            return;
        }

        try {
            setRespondingId(clarificationId);
            setError("");

            await ticketService.respondToClarification(
                ticketId,
                clarificationId,
                responseText
            );

            setResponses((previous) => ({
                ...previous,
                [clarificationId]: ""
            }));

            await loadWorkspace();

            alert("Your clarification response was submitted.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to submit clarification response."
            );
        } finally {
            setRespondingId(null);
        }
    };

    // MANAGER: UPDATE STATUS
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

    // MANAGER: ASSIGN AGENT
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

    // MANAGER: RESUME ON HOLD TICKET
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

const loadMyReopenRequests = useCallback(async () => {
    if (role !== "customer") return;

    try {
        const result = await ticketService.getMyReopenRequests();
        setReopenRequests(
            Array.isArray(result)
                ? result
                : Array.isArray(result?.data)
                    ? result.data
                    : []
        );
    } catch (err) {
        console.error("Unable to load reopen requests:", err);
    }
}, [role]);

const handleRequestReopen = async (e) => {
    e.preventDefault();

    const reason = reopenReason.trim();

    if (reason.length < 5) {
        setError("Please enter a reopening reason with at least 5 characters.");
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

        alert("Your reopening request has been submitted to the manager.");
    } catch (err) {
        setError(
            err.response?.data?.message ||
            "Unable to submit reopening request."
        );
    } finally {
        setSubmittingReopen(false);
    }
};

    // DATE FORMAT
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
    useEffect(() => {
    if (role === "customer") {
        loadMyReopenRequests();
    }
}, [role, loadMyReopenRequests]);

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

    const canSendPrivate =
        role === "agent" || role === "manager";

    const visibleMessages = messages.filter((item) => {
        return !(
            role === "customer" &&
            item.message_type === "private"
        );
    });

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
                    If your issue is not resolved, submit a reopening
                    request with a reason. The manager will review it.
                </p>

                {reopenRequests.some(
                    (item) =>
                        Number(item.ticket_id) === Number(ticketId) &&
                        item.status === "Pending"
                ) ? (
                    <div className="alert alert-warning mb-0">
                        <i className="bi bi-clock me-2"></i>
                        Your reopening request is pending manager approval.
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

                            {/* RESUME ON HOLD TICKET */}
                            {ticket.status === "On Hold" && (
                                <div className="col-12">
                                    <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-3 mb-0">
                                        <div>
                                            <strong>
                                                <i className="bi bi-pause-circle me-2"></i>
                                                Ticket is On Hold
                                            </strong>

                                            <p className="mb-0 small">
                                                Review the customer's clarification before resuming.
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

            {/* CLARIFICATION WORKFLOW */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <div>
                            <h5 className="fw-bold mb-1">
                                <i className="bi bi-question-circle me-2 text-primary"></i>
                                Clarification
                            </h5>

                            <small className="text-muted">
                                Questions and responses related to this ticket
                            </small>
                        </div>

                        <span className="badge text-bg-secondary">
                            {clarifications.length} Requests
                        </span>
                    </div>

                    {/* AGENT REQUEST FORM */}
                    {role === "agent" &&
                        !["Resolved", "Closed"].includes(ticket.status) && (
                            <form
                                onSubmit={handleRequestClarification}
                                className="bg-light rounded p-3 mb-4"
                            >
                                <label className="form-label fw-semibold">
                                    Ask customer for clarification
                                </label>

                                <textarea
                                    className="form-control mb-3"
                                    rows="3"
                                    placeholder="Example: Please share a screenshot of the error."
                                    value={question}
                                    onChange={(e) =>
                                        setQuestion(e.target.value)
                                    }
                                />

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={requesting}
                                >
                                    <i className="bi bi-send me-2"></i>

                                    {requesting
                                        ? "Submitting..."
                                        : "Request Clarification"}
                                </button>
                            </form>
                        )}

                    {/* CLARIFICATION LIST */}
                    {clarifications.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            <i className="bi bi-chat-square-text fs-2"></i>
                            <p className="mb-0 mt-2">
                                No clarification requests yet.
                            </p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {clarifications.map((item) => (
                                <div
                                    key={item.clarification_id}
                                    className="border rounded p-3"
                                >
                                    <div className="d-flex justify-content-between flex-wrap gap-2">
                                        <strong>
                                            <i className="bi bi-question-circle me-2 text-primary"></i>
                                            Agent's Question
                                        </strong>

                                        <span
                                            className={`badge ${
                                                item.status === "Responded"
                                                    ? "text-bg-success"
                                                    : item.status === "Cancelled"
                                                        ? "text-bg-secondary"
                                                        : "text-bg-warning"
                                            }`}
                                        >
                                            {item.status}
                                        </span>
                                    </div>

                                    <p className="mt-2 mb-1">
                                        {item.question}
                                    </p>

                                    <small className="text-muted">
                                        Asked: {formatDate(item.created_at)}
                                    </small>

                                    {item.customer_response && (
                                        <div className="alert alert-success mt-3 mb-0">
                                            <strong>
                                                <i className="bi bi-reply me-2"></i>
                                                Customer Response
                                            </strong>

                                            <p className="mb-1 mt-2">
                                                {item.customer_response}
                                            </p>

                                            <small className="text-muted">
                                                Responded: {formatDate(item.responded_at)}
                                            </small>
                                        </div>
                                    )}

                                    {/* CUSTOMER RESPONSE FORM */}
                                    {role === "customer" &&
                                        item.status === "Waiting" && (
                                            <div className="mt-3">
                                                <label className="form-label fw-semibold">
                                                    Your Response
                                                </label>

                                                <textarea
                                                    className="form-control mb-2"
                                                    rows="3"
                                                    placeholder="Enter your response..."
                                                    value={
                                                        responses[item.clarification_id] || ""
                                                    }
                                                    onChange={(e) =>
                                                        setResponses((previous) => ({
                                                            ...previous,
                                                            [item.clarification_id]: e.target.value
                                                        }))
                                                    }
                                                />

                                                <button
                                                    type="button"
                                                    className="btn btn-success"
                                                    onClick={() =>
                                                        handleClarificationResponse(
                                                            item.clarification_id
                                                        )
                                                    }
                                                    disabled={
                                                        respondingId === item.clarification_id
                                                    }
                                                >
                                                    <i className="bi bi-send me-2"></i>

                                                    {respondingId === item.clarification_id
                                                        ? "Submitting..."
                                                        : "Submit Response"}
                                                </button>
                                            </div>
                                        )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
                                                ACTIVITY_ICONS[activity.activity_type] ||
                                                "bi-circle"
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

            {/* CONVERSATION */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <div>
                            <h5 className="fw-bold mb-1">
                                <i className="bi bi-chat-dots me-2 text-primary"></i>
                                Ticket Conversation
                            </h5>

                            <small className="text-muted">
                                Messages refresh automatically every 5 seconds
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
                                        String(senderId) ===
                                        String(
                                            typeof window !== "undefined"
                                                ? JSON.parse(
                                                    localStorage.getItem("user") || "{}"
                                                )?.user_id
                                                : ""
                                        );

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
                    </form>
                </div>
            </div>
        </div>
    );
}
