
"use client";

import { useRouter } from "next/navigation";
import { Ticket, CalendarDays, ArrowRight } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function TicketCard({ ticket, basePath = "/customer/tickets" }) {
    const router = useRouter();

    if (!ticket) return null;

    const ticketId = ticket.ticket_id;

    return (
        <div className="card dashboard-card border-0 shadow-sm h-100">
            <div className="card-body p-4">

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-2">
                        <Ticket size={22} />
                    </div>

                    <StatusBadge status={ticket.status} />
                </div>

                <small className="text-muted">
                    Ticket #{ticketId}
                </small>

                <h6 className="fw-bold mt-2 mb-2">
                    {ticket.subject || "Untitled Ticket"}
                </h6>

                <p
                    className="text-muted small mb-3"
                    style={{
                        minHeight: "42px",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                    }}
                >
                    {ticket.description || "No description available."}
                </p>

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="small text-muted">
                        Priority
                    </span>

                    <span className="badge text-bg-light border text-dark text-capitalize">
                        {ticket.priority || "Normal"}
                    </span>
                </div>

                <div className="d-flex align-items-center justify-content-between border-top pt-3">
                    <small className="text-muted">
                        <CalendarDays size={14} className="me-1" />
                        {ticket.created_at
                            ? new Date(ticket.created_at).toLocaleDateString()
                            : "Date unavailable"}
                    </small>

                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                            router.push(`${basePath}/${ticketId}`)
                        }
                    >
                        View <ArrowRight size={14} className="ms-1" />
                    </button>
                </div>

            </div>
        </div>
    );
}
