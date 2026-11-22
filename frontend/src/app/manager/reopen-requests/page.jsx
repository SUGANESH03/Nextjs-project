
"use client";

import { useCallback, useEffect, useState } from "react";

import DashboardLayout from "../../components/common/DashboardLayout";
import ProtectedRoute from "../../utils/ProtectedRoute";
import ticketService from "../../services/ticketService";

export default function ReopenRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [comments, setComments] = useState({});
    const [error, setError] = useState("");

    // LOAD REOPEN REQUESTS
    const loadRequests = useCallback(async () => {
        try {
            setError("");

            const result =
                await ticketService.getReopenRequests();

            setRequests(
                Array.isArray(result)
                    ? result
                    : Array.isArray(result?.requests)
                        ? result.requests
                        : Array.isArray(result?.data)
                            ? result.data
                            : []
            );
        } catch (err) {
            console.error("Unable to load reopen requests:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load reopening requests."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // MANAGER: APPROVE OR REJECT REQUEST
    const reviewRequest = async (requestId, decision) => {
        const action =
            decision === "Approved" ? "approve" : "reject";

        if (
            !window.confirm(
                `Are you sure you want to ${action} this reopening request?`
            )
        ) {
            return;
        }

        try {
            setBusyId(requestId);
            setError("");

            const managerComment =
                String(comments[requestId] || "").trim();

            await ticketService.reviewReopenRequest(
                requestId,
                decision,
                managerComment
            );

            setComments((previous) => ({
                ...previous,
                [requestId]: ""
            }));

            await loadRequests();

            alert(
                `Reopening request ${action}d successfully.`
            );
        } catch (err) {
            console.error("Review request error:", err);

            alert(
                err.response?.data?.message ||
                "Unable to process reopening request."
            );
        } finally {
            setBusyId(null);
        }
    };

    const getStatusBadge = (status) => {
        const normalized = String(status || "Pending").toLowerCase();

        if (normalized === "approved") {
            return "text-bg-success";
        }

        if (normalized === "rejected") {
            return "text-bg-danger";
        }

        return "text-bg-warning";
    };

    return (
        <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardLayout title="Ticket Reopen Requests">

                <div className="container-fluid py-3">

                    {/* HEADER */}
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                        <div>
                            <h4 className="fw-bold mb-1">
                                Ticket Reopen Requests
                            </h4>

                            <p className="text-muted mb-0">
                                Review customer requests to reopen resolved or closed tickets.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={loadRequests}
                            disabled={loading}
                        >
                            <i className="bi bi-arrow-clockwise me-2"></i>
                            Refresh
                        </button>
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div className="alert alert-danger">
                            {error}
                        </div>
                    )}

                    {/* REQUEST TABLE */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                Customer Reopen Requests
                            </h5>

                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary"></div>

                                    <p className="text-muted mt-2 mb-0">
                                        Loading requests...
                                    </p>
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bi bi-inbox fs-1 text-muted"></i>

                                    <h6 className="mt-3">
                                        No reopen requests
                                    </h6>

                                    <p className="text-muted mb-0">
                                        Customer reopening requests will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Request ID</th>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                                <th style={{ minWidth: "250px" }}>
                                                    Manager Review
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {requests.map((item) => {
                                                const id =
                                                    item.request_id ||
                                                    item.reopen_request_id;

                                                const status = String(
                                                    item.status || "Pending"
                                                ).toLowerCase();

                                                const isPending =
                                                    status === "pending";

                                                return (
                                                    <tr key={id}>
                                                        <td>
                                                            <strong>#{id}</strong>
                                                        </td>

                                                        <td>
                                                            #{item.ticket_id}
                                                        </td>

                                                        <td>
                                                            <div className="fw-semibold">
                                                                {item.customer_name || "Customer"}
                                                            </div>

                                                            <small className="text-muted">
                                                                {item.customer_email || ""}
                                                            </small>
                                                        </td>

                                                        <td style={{ minWidth: "180px" }}>
                                                            {item.reason}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`badge ${getStatusBadge(status)}`}
                                                            >
                                                                {status}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {isPending ? (
                                                                <div>
                                                                    <textarea
                                                                        className="form-control form-control-sm mb-2"
                                                                        rows="2"
                                                                        placeholder="Manager comments (optional)"
                                                                        value={comments[id] || ""}
                                                                        onChange={(e) =>
                                                                            setComments((previous) => ({
                                                                                ...previous,
                                                                                [id]: e.target.value
                                                                            }))
                                                                        }
                                                                    />

                                                                    <div className="d-flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-success"
                                                                            disabled={busyId === id}
                                                                            onClick={() =>
                                                                                reviewRequest(
                                                                                    id,
                                                                                    "Approved"
                                                                                )
                                                                            }
                                                                        >
                                                                            {busyId === id ? (
                                                                                "Processing..."
                                                                            ) : (
                                                                                <>
                                                                                    <i className="bi bi-check-circle me-1"></i>
                                                                                    Approve
                                                                                </>
                                                                            )}
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-danger"
                                                                            disabled={busyId === id}
                                                                            onClick={() =>
                                                                                reviewRequest(
                                                                                    id,
                                                                                    "Rejected"
                                                                                )
                                                                            }
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <span className="text-muted small">
                                                                        Reviewed
                                                                    </span>

                                                                    {item.manager_comment && (
                                                                        <p className="small mb-0 mt-1">
                                                                            {item.manager_comment}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

            </DashboardLayout>
        </ProtectedRoute>
    );
}
