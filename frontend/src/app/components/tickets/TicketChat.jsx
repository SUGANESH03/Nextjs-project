
"use client";

import { useEffect, useState } from "react";
import { Send, Lock, MessageCircle } from "lucide-react";
import conversationService from "../../services/conversationService";
import { useAuth } from "../../context/AuthContext";

export default function TicketChat({ ticketId }) {
    const { user } = useAuth();

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const loadMessages = async () => {
        try {
            const result =
                await conversationService.getMessages(ticketId);

            setMessages(
                Array.isArray(result)
                    ? result
                    : result.messages || []
            );
        } catch (err) {
            setError("Unable to load conversation.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ticketId) loadMessages();
    }, [ticketId]);

    const handleSend = async (e) => {
        e.preventDefault();

        if (!message.trim()) return;

        try {
            setSending(true);
            setError("");

            await conversationService.sendMessage(
                ticketId,
                message,
                user?.role === "customer" ? false : isPrivate
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

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
                <h5 className="fw-bold mb-3">
                    <MessageCircle size={20} className="me-2" />
                    Ticket Conversation
                </h5>

                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                <div
                    className="border rounded p-3 mb-3"
                    style={{
                        height: "350px",
                        overflowY: "auto",
                        background: "#f8fafc"
                    }}
                >
                    {loading ? (
                        <div className="text-center py-5">
                            Loading messages...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-muted py-5">
                            No messages yet.
                        </div>
                    ) : (
                        messages.map((item, index) => (
                            <div
                                key={item.message_id || index}
                                className="bg-white border rounded p-3 mb-3"
                            >
                                <div className="d-flex justify-content-between flex-wrap gap-2">
                                    <strong>
                                        {item.sender_name ||
                                            item.sender?.full_name ||
                                            "Support"}
                                    </strong>

                                    {item.is_private ? (
                                        <span className="badge text-bg-warning">
                                            <Lock size={12} /> Private
                                        </span>
                                    ) : (
                                        <span className="badge text-bg-success">
                                            Public
                                        </span>
                                    )}
                                </div>

                                <p className="mb-1 mt-2">
                                    {item.message}
                                </p>

                                <small className="text-muted">
                                    {item.created_at
                                        ? new Date(
                                            item.created_at
                                        ).toLocaleString()
                                        : ""}
                                </small>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={handleSend}>
                    {(user?.role === "agent" ||
                        user?.role === "manager") && (
                        <div className="form-check mb-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="privateChat"
                                checked={isPrivate}
                                onChange={(e) =>
                                    setIsPrivate(e.target.checked)
                                }
                            />

                            <label
                                className="form-check-label"
                                htmlFor="privateChat"
                            >
                                Private internal message
                            </label>
                        </div>
                    )}

                    <div className="input-group">
                        <input
                            className="form-control"
                            value={message}
                            onChange={(e) =>
                                setMessage(e.target.value)
                            }
                            placeholder="Type your message..."
                        />

                        <button
                            className="btn btn-primary"
                            disabled={sending || !message.trim()}
                        >
                            <Send size={17} />
                            <span className="ms-1">
                                {sending ? "Sending..." : "Send"}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
