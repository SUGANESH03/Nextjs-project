
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import notificationService from "../../services/notificationService";

export default function NotificationsBell() {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const notificationPath =
        user?.role === "customer"
            ? "/customer/notifications"
            : user?.role === "agent"
            ? "/agent/notifications"
            : "/manager/notifications";

    const fetchUnreadCount = async () => {
        try {
            const response =
                await notificationService.getUnreadCount();

            const count =
                response.unread_count ??
                response.count ??
                response.unreadCount ??
                0;

            setUnreadCount(Number(count));
        } catch (error) {
            console.error(
                "Failed to fetch unread notifications:",
                error
            );
        }
    };

    useEffect(() => {
        if (!user) return;

        fetchUnreadCount();

        const interval = setInterval(
            fetchUnreadCount,
            30000
        );

        return () => clearInterval(interval);
    }, [user]);

    return (
        <Link
            href={notificationPath}
            className="position-relative text-dark d-inline-flex align-items-center"
            aria-label="Notifications"
            title="Notifications"
        >
            <Bell size={23} />

            {unreadCount > 0 && (
                <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{
                        fontSize: "10px",
                        minWidth: "18px"
                    }}
                >
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </Link>
    );
}
