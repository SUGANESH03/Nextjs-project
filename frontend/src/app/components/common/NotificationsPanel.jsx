
"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Bell,
    CheckCheck,
    Clock,
    RefreshCw,
    CircleDot,
    Inbox
} from "lucide-react";

import notificationService from "../../services/notificationService";

export default function NotificationPanel() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all");

    // Load notifications
    const loadNotifications = useCallback(async (manual = false) => {
        try {
            if (manual) setRefreshing(true);

            const result = await notificationService.getAll();

            const data = Array.isArray(result)
                ? result
                : result.notifications || [];

            setNotifications(data);
        } catch (error) {
            console.error(
                "Notification loading failed:",
                error.response?.data || error.message
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load and automatic refresh
    useEffect(() => {
        loadNotifications();

        const interval = setInterval(() => {
            loadNotifications();
        }, 5000);

        return () => clearInterval(interval);
    }, [loadNotifications]);

    // Mark one notification as read
    const markRead = async (id) => {
        try {
            await notificationService.markAsRead(id);

            setNotifications((previous) =>
                previous.map((item) =>
                    Number(item.notification_id) === Number(id)
                        ? { ...item, is_read: 1 }
                        : item
                )
            );
        } catch (error) {
            console.error(
                "Unable to mark notification as read:",
                error.response?.data || error.message
            );
        }
    };

    // Mark all notifications as read
    const markAllRead = async () => {
        try {
            await notificationService.markAllAsRead();

            setNotifications((previous) =>
                previous.map((item) => ({
                    ...item,
                    is_read: 1
                }))
            );
        } catch (error) {
            console.error(
                "Unable to mark all as read:",
                error.response?.data || error.message
            );
        }
    };

    const unreadCount = notifications.filter(
        (item) => Number(item.is_read) === 0
    ).length;

    const readCount = notifications.length - unreadCount;

    const filteredNotifications = notifications.filter((item) => {
        if (filter === "unread") {
            return Number(item.is_read) === 0;
        }

        if (filter === "read") {
            return Number(item.is_read) !== 0;
        }

        return true;
    });

    const getNotificationStyle = (title = "") => {
        const value = title.toLowerCase();

        if (value.includes("offline")) {
            return {
                icon: "bi-wifi-off",
                color: "danger",
                label: "Offline"
            };
        }

        if (value.includes("online")) {
            return {
                icon: "bi-wifi",
                color: "success",
                label: "Online"
            };
        }

        if (value.includes("resolved") || value.includes("closed")) {
            return {
                icon: "bi-check-circle",
                color: "success",
                label: "Completed"
            };
        }

        if (value.includes("hold")) {
            return {
                icon: "bi-pause-circle",
                color: "warning",
                label: "On Hold"
            };
        }

        if (value.includes("message")) {
            return {
                icon: "bi-chat-dots",
                color: "primary",
                label: "Message"
            };
        }

        if (value.includes("claimed") || value.includes("assigned")) {
            return {
                icon: "bi-person-check",
                color: "info",
                label: "Assignment"
            };
        }

        return {
            icon: "bi-bell",
            color: "primary",
            label: "Update"
        };
    };

    const formatDate = (date) => {
        if (!date) return "";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) return "";

        return parsed.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="container-fluid px-0">

            <style jsx>{`
                .notification-header {
                    background: linear-gradient(120deg, #172554, #1d4ed8);
                    border-radius: 16px;
                    color: white;
                }

                .notification-card {
                    border: 1px solid #edf0f5;
                    border-radius: 12px;
                    transition: all .2s ease;
                }

                .notification-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 18px rgba(15, 23, 42, .07);
                }

                .notification-icon {
                    width: 46px;
                    height: 46px;
                    min-width: 46px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .notification-unread {
                    background: #f0f6ff;
                    border-left: 4px solid #2563eb;
                }

                .notification-read {
                    background: white;
                }

                .filter-btn {
                    border-radius: 20px;
                    padding: 7px 18px;
                }
            `}</style>

            {/* HEADER */}
            <div className="notification-header p-4 p-md-5 mb-4 shadow-sm">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <Bell size={25} />
                            <h3 className="fw-bold mb-0">
                                Notifications
                            </h3>
                        </div>

                        <p className="mb-0 opacity-75">
                            Stay updated with tickets and support activities.
                        </p>
                    </div>

                    <button
                        className="btn btn-light btn-sm fw-semibold"
                        onClick={() => loadNotifications(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw
                            size={15}
                            className="me-2"
                        />
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="row g-3 mb-4">

                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="notification-icon bg-primary bg-opacity-10 text-primary">
                                <Bell size={22} />
                            </div>

                            <div>
                                <small className="text-muted">
                                    Total Notifications
                                </small>
                                <h4 className="fw-bold mb-0">
                                    {notifications.length}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="notification-icon bg-danger bg-opacity-10 text-danger">
                                <CircleDot size={22} />
                            </div>

                            <div>
                                <small className="text-muted">
                                    Unread Notifications
                                </small>
                                <h4 className="fw-bold mb-0 text-danger">
                                    {unreadCount}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="notification-icon bg-success bg-opacity-10 text-success">
                                <CheckCheck size={22} />
                            </div>

                            <div>
                                <small className="text-muted">
                                    Read Notifications
                                </small>
                                <h4 className="fw-bold mb-0 text-success">
                                    {readCount}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* NOTIFICATION LIST */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-3 p-md-4">

                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                        <div>
                            <h5 className="fw-bold mb-1">
                                Recent Activity
                            </h5>

                            <small className="text-muted">
                                Your latest system updates
                            </small>
                        </div>

                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={markAllRead}
                            disabled={unreadCount === 0}
                        >
                            <CheckCheck
                                size={15}
                                className="me-1"
                            />
                            Mark all as read
                        </button>
                    </div>

                    {/* FILTERS */}
                    <div className="d-flex flex-wrap gap-2 mb-4">
                        {[
                            { value: "all", label: "All" },
                            { value: "unread", label: "Unread" },
                            { value: "read", label: "Read" }
                        ].map((item) => (
                            <button
                                key={item.value}
                                className={`btn btn-sm filter-btn ${
                                    filter === item.value
                                        ? "btn-primary"
                                        : "btn-outline-secondary"
                                }`}
                                onClick={() => setFilter(item.value)}
                            >
                                {item.label}

                                {item.value === "unread" &&
                                    unreadCount > 0 && (
                                        <span className="badge bg-light text-primary ms-2">
                                            {unreadCount}
                                        </span>
                                    )}
                            </button>
                        ))}
                    </div>

                    {/* LOADING */}
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" />
                            <p className="text-muted mt-3 mb-0">
                                Loading notifications...
                            </p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-5">
                            <div className="notification-icon bg-light text-secondary mx-auto mb-3">
                                <Inbox size={27} />
                            </div>

                            <h6 className="fw-bold">
                                No notifications found
                            </h6>

                            <p className="text-muted mb-0">
                                You're all caught up!
                            </p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">

                            {filteredNotifications.map((item, index) => {
                                const id = item.notification_id;
                                const unread =
                                    Number(item.is_read) === 0;

                                const style = getNotificationStyle(
                                    item.title
                                );

                                return (
                                    <div
                                        key={id || index}
                                        className={`notification-card p-3 ${
                                            unread
                                                ? "notification-unread"
                                                : "notification-read"
                                        }`}
                                    >
                                        <div className="d-flex align-items-start gap-3">

                                            <div className={`notification-icon bg-${style.color} bg-opacity-10 text-${style.color}`}>
                                                <i className={`bi ${style.icon} fs-5`}></i>
                                            </div>

                                            <div className="flex-grow-1 min-width-0">

                                                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                                    <div>
                                                        <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                                                            <h6 className="fw-bold mb-0">
                                                                {item.title || "Notification"}
                                                            </h6>

                                                            <span className={`badge text-bg-${style.color}`}>
                                                                {style.label}
                                                            </span>

                                                            {unread && (
                                                                <span className="badge bg-primary">
                                                                    New
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="text-secondary mb-2">
                                                            {item.message}
                                                        </p>
                                                    </div>

                                                    {unread && (
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => markRead(id)}
                                                        >
                                                            <CheckCheck
                                                                size={14}
                                                                className="me-1"
                                                            />
                                                            Mark read
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="d-flex align-items-center flex-wrap gap-3 text-muted">
                                                    <small>
                                                        <Clock
                                                            size={13}
                                                            className="me-1"
                                                        />
                                                        {formatDate(item.created_at)}
                                                    </small>

                                                    {item.ticket_id && (
                                                        <small className="fw-semibold">
                                                            Ticket #{item.ticket_id}
                                                        </small>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
