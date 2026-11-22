
"use client";

import { useParams } from "next/navigation";
import DashboardLayout from "../../../components/common/DashboardLayout";
import ProtectedRoute from "../../../utils/ProtectedRoute";
import TicketWorkspace from "../../../components/tickets/TicketWorkspace";

export default function ManagerTicketDetails() {
    const params = useParams();

    return (
        <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardLayout title="Ticket Management">
                <TicketWorkspace
                    ticketId={params.id}
                    role="manager"
                />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
