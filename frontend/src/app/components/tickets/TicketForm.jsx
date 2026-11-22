
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ticketService from "../../services/ticketService";

export default function TicketForm() {
    const router = useRouter();

    const [form, setForm] = useState({
        subject: "",
        description: "",
        category: "",
        priority: "medium"
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm((previous) => ({
            ...previous,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.subject.trim() || !form.description.trim()) {
            setError("Subject and description are required.");
            return;
        }

        try {
            setLoading(true);

            await ticketService.create({
                ...form,
                subject: form.subject.trim(),
                description: form.description.trim()
            });

            router.push("/customer/tickets");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to create ticket."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
                <h5 className="fw-bold mb-4">
                    Create Support Ticket
                </h5>

                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-semibold">
                            Subject
                        </label>

                        <input
                            className="form-control"
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            placeholder="Enter ticket subject"
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-semibold">
                            Category
                        </label>

                        <input
                            className="form-control"
                            name="category"
                            value={form.category}
                            onChange={handleChange}
                            placeholder="Enter category"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-semibold">
                            Priority
                        </label>

                        <select
                            className="form-select"
                            name="priority"
                            value={form.priority}
                            onChange={handleChange}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-semibold">
                            Description
                        </label>

                        <textarea
                            className="form-control"
                            rows="5"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Explain your issue..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary px-4"
                        disabled={loading}
                    >
                        {loading ? "Submitting..." : "Submit Ticket"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-light ms-2"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
}
