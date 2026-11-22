
"use client";

import { useParams } from "next/navigation";

import DashboardLayout from "../../../components/common/DashboardLayout";
import ProtectedRoute from "../../../utils/ProtectedRoute";
import TicketWorkspace from "../../../components/tickets/TicketWorkspace";

export default function AgentTicketDetailsPage() {
    const params = useParams();

    return (
        <ProtectedRoute allowedRoles={["agent"]}>
            <DashboardLayout title="Ticket Workspace">
                <TicketWorkspace
                    ticketId={params.id}
                    role="agent"
                />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
