
"use client";

import DashboardLayout from "../../components/common/DashboardLayout";
import NotificationsPanel from "../../components/common/NotificationsPanel";
import ProtectedRoute from "../../utils/ProtectedRoute";

export default function CustomerNotifications() {
    return (
        <ProtectedRoute allowedRoles={["customer"]}>
            <DashboardLayout title="Notifications">
                <NotificationsPanel />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
