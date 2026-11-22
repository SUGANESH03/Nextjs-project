
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
    children,
    allowedRoles = []
}) {
    const router = useRouter();
    const { user, loading } = useAuth();

    const userRole = user?.role?.toLowerCase();

    const normalizedRoles = allowedRoles.map(role =>
        role.toLowerCase()
    );

    const hasPermission =
        normalizedRoles.length === 0 ||
        normalizedRoles.includes(userRole);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace("/login");
            return;
        }

        if (!hasPermission) {
            const dashboardRoutes = {
                customer: "/customer/dashboard",
                agent: "/agent/dashboard",
                manager: "/manager/dashboard"
            };

            router.replace(
                dashboardRoutes[userRole] || "/login"
            );
        }
    }, [loading, user, hasPermission, userRole, router]);

    if (loading) {
        return (
            <div className="min-vh-100 d-flex justify-content-center align-items-center">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" />
                    <p>Restoring your session...</p>
                </div>
            </div>
        );
    }

    if (!user || !hasPermission) {
        return null;
    }

    return children;
}
