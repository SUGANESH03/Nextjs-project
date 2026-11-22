
"use client";

import { CalendarDays, User, Tag, Ticket } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function TicketDetails({ ticket }) {
    if (!ticket) {
        return (
            <div className="alert alert-warning">
                Ticket details not available.
            </div>
        );
    }

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
                <div className="d-flex justify-content-between flex-wrap gap-3">
                    <div>
                        <small className="text-muted">
                            Ticket #{ticket.ticket_id}
                        </small>

                        <h4 className="fw-bold mt-2">
                            {ticket.subject}
                        </h4>
                    </div>

                    <StatusBadge status={ticket.status} />
                </div>

                <hr />

                <h6 className="fw-semibold">
                    Issue Description
                </h6>

                <p className="text-muted">
                    {ticket.description || "No description provided."}
                </p>

                <div className="row g-3 mt-3">
                    <div className="col-md-6">
                        <div className="bg-light rounded p-3">
                            <Ticket size={18} className="text-primary me-2" />
                            <strong>Priority</strong>
                            <p className="mb-0 mt-2 text-capitalize">
                                {ticket.priority || "Normal"}
                            </p>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="bg-light rounded p-3">
                            <Tag size={18} className="text-primary me-2" />
                            <strong>Category</strong>
                            <p className="mb-0 mt-2">
                                {ticket.category || "General"}
                            </p>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="bg-light rounded p-3">
                            <User size={18} className="text-primary me-2" />
                            <strong>Customer</strong>
                            <p className="mb-0 mt-2">
                                {ticket.customer_name ||
                                    ticket.full_name ||
                                    "Customer"}
                            </p>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="bg-light rounded p-3">
                            <CalendarDays
                                size={18}
                                className="text-primary me-2"
                            />
                            <strong>Created Date</strong>
                            <p className="mb-0 mt-2">
                                {ticket.created_at
                                    ? new Date(
                                        ticket.created_at
                                    ).toLocaleDateString()
                                    : "Not available"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
