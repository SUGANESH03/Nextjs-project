
"use client";

import { useParams } from "next/navigation";

import DashboardLayout from "../../../components/common/DashboardLayout";
import ProtectedRoute from "../../../utils/ProtectedRoute";
import TicketWorkspace from "../../../components/tickets/TicketWorkspace";

export default function CustomerTicketDetailsPage() {
    const params = useParams();

    return (
        <ProtectedRoute allowedRoles={["customer"]}>
            <DashboardLayout title="My Ticket Details">
                <TicketWorkspace
                    ticketId={params.id}
                    role="customer"
                />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
