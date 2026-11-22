
"use client";

import { useRouter } from "next/navigation";
import StatusBadge from "./StatusBadge";

export default function TicketTable({ tickets = [], loading = false }) {
    const router = useRouter();

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" />
                <p className="text-muted mt-2">Loading tickets...</p>
            </div>
        );
    }

    if (!tickets.length) {
        return (
            <div className="text-center py-5">
                <h6>No tickets found</h6>
                <p className="text-muted mb-0">
                    Tickets will appear here when available.
                </p>
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <table className="table table-hover align-middle">
                <thead className="table-light">
                    <tr>
                        <th>Ticket ID</th>
                        <th>Subject</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {tickets.map((ticket) => {
                        const id = ticket.ticket_id;

                        return (
                            <tr key={id}>
                                <td>#{id}</td>
                                <td>{ticket.subject}</td>
                                <td className="text-capitalize">
                                    {ticket.priority}
                                </td>
                                <td>
                                    <StatusBadge status={ticket.status} />
                                </td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() =>
                                            router.push(
                                                `/customer/tickets/${id}`
                                            )
                                        }
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
