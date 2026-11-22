
"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import notificationService from "../../services/notificationService";

export default function NotificationPanel() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = async () => {
        try {
            const result = await notificationService.getAll();

            setNotifications(
                Array.isArray(result)
                    ? result
                    : result.notifications || []
            );
        } catch (error) {
            console.error("Notification loading failed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const markRead = async (id) => {
        try {
            await notificationService.markAsRead(id);

            setNotifications((previous) =>
                previous.map((item) =>
                    item.notification_id === id
                        ? { ...item, is_read: 1 }
                        : item
                )
            );
        } catch (error) {
            console.error("Unable to mark notification as read:", error);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            await loadNotifications();
        } catch (error) {
            console.error("Unable to mark all as read:", error);
        }
    };

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold mb-0">
                        <Bell size={20} className="me-2" />
                        Notifications
                    </h5>

                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={markAllRead}
                    >
                        <CheckCheck size={15} className="me-1" />
                        Mark all read
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-5">
                        <Bell size={35} className="text-muted mb-2" />
                        <p className="text-muted mb-0">
                            No notifications available.
                        </p>
                    </div>
                ) : (
                    notifications.map((item, index) => {
                        const id = item.notification_id;
                        const unread =
                            !item.is_read &&
                            item.is_read !== 1;

                        return (
                            <div
                                key={id || index}
                                className={`border-bottom p-3 ${
                                    unread ? "bg-light" : ""
                                }`}
                            >
                                <div className="d-flex justify-content-between gap-3">
                                    <div>
                                        <h6 className="fw-semibold mb-1">
                                            {item.title || "Notification"}
                                        </h6>

                                        <p className="text-muted mb-1">
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

                                    {unread && (
                                        <button
                                            className="btn btn-sm btn-outline-primary align-self-start"
                                            onClick={() => markRead(id)}
                                        >
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
