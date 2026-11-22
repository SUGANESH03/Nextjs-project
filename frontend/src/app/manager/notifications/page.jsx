
"use client";

import DashboardLayout from "../../components/common/DashboardLayout";
import NotificationsPanel from "../../components/common/NotificationsPanel";
import ProtectedRoute from "../../utils/ProtectedRoute";

export default function ManagerNotifications() {
    return (
        <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardLayout title="Notifications">
                <NotificationsPanel />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
