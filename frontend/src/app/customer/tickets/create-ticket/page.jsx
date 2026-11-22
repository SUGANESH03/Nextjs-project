
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import DashboardLayout from "../../../components/common/DashboardLayout";
import ProtectedRoute from "../../../utils/ProtectedRoute";
import ticketService from "../../../services/ticketService";

const INITIAL_FORM = {
    subject: "",
    description: "",
    category: "",
    priority: "Medium"
};

export default function CreateTicketPage() {
    const router = useRouter();

    const [form, setForm] = useState(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            !form.subject.trim() ||
            !form.description.trim() ||
            !form.category.trim()
        ) {
            setError("Please fill in all required fields.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            await ticketService.create({
                subject: form.subject.trim(),
                description: form.description.trim(),
                category: form.category.trim(),
                priority: form.priority
            });

            alert("Ticket created successfully!");

            router.push("/customer/tickets");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to create ticket. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["customer"]}>
            <DashboardLayout title="Create New Ticket">
                <div className="container-fluid py-3">
                    <div className="row justify-content-center">
                        <div className="col-lg-8 col-xl-7">
                            <div className="card border-0 shadow-sm">
                                <div className="card-body p-4 p-md-5">

                                    <div className="mb-4">
                                        <div className="d-flex align-items-center gap-3 mb-3">
                                            <div
                                                className="bg-primary bg-opacity-10 text-primary rounded-3 p-3"
                                            >
                                                <i className="bi bi-ticket-perforated fs-3"></i>
                                            </div>

                                            <div>
                                                <h4 className="fw-bold mb-1">
                                                    Create Support Ticket
                                                </h4>

                                                <p className="text-muted mb-0">
                                                    Describe your issue and our support team will assist you.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="alert alert-danger">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit}>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Subject *
                                            </label>

                                            <input
                                                type="text"
                                                name="subject"
                                                className="form-control"
                                                placeholder="Enter ticket subject"
                                                value={form.subject}
                                                onChange={handleChange}
                                                maxLength={190}
                                                required
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Category *
                                            </label>

                                            <select
                                                name="category"
                                                className="form-select"
                                                value={form.category}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="">
                                                    Select Category
                                                </option>
                                                <option value="Technical Support">
                                                    Technical Support
                                                </option>
                                                <option value="Billing">
                                                    Billing
                                                </option>
                                                <option value="Account">
                                                    Account
                                                </option>
                                                <option value="General">
                                                    General
                                                </option>
                                                <option value="Other">
                                                    Other
                                                </option>
                                            </select>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Priority *
                                            </label>

                                            <select
                                                name="priority"
                                                className="form-select"
                                                value={form.priority}
                                                onChange={handleChange}
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Critical">Critical</option>
                                            </select>
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label fw-semibold">
                                                Description *
                                            </label>

                                            <textarea
                                                name="description"
                                                className="form-control"
                                                rows="5"
                                                placeholder="Explain your issue in detail..."
                                                value={form.description}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <div className="d-flex justify-content-end gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-light border"
                                                onClick={() =>
                                                    router.push("/customer/tickets")
                                                }
                                                disabled={loading}
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                className="btn btn-primary px-4"
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-plus-circle me-2"></i>
                                                        Create Ticket
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
