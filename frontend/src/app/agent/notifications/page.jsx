
"use client";

import DashboardLayout from "../../components/common/DashboardLayout";
import NotificationsPanel from "../../components/common/NotificationsPanel";
import ProtectedRoute from "../../utils/ProtectedRoute";

export default function AgentNotifications() {
    return (
        <ProtectedRoute allowedRoles={["agent"]}>
            <DashboardLayout title="Notifications">
                <NotificationsPanel />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
