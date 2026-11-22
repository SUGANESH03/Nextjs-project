
"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/common/DashboardLayout";
import ProtectedRoute from "../../utils/ProtectedRoute";
import agentService from "../../services/agentService";

export default function ManageAgents() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        full_name: "",
        email: "",
        password: ""
    });

    const loadAgents = async () => {
        try {
            const result = await agentService.getAll();

            setAgents(
                Array.isArray(result)
                    ? result
                    : result.agents || []
            );
        } catch (err) {
            setError("Unable to load agents.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAgents();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        try {
            setSaving(true);

            await agentService.create(form);

            setForm({
                full_name: "",
                email: "",
                password: ""
            });

            setSuccess("Agent created successfully.");
            await loadAgents();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to create agent."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardLayout title="Manage Agents">
                <div className="row g-4">
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-3">
                                    Create New Agent
                                </h5>

                                {error && (
                                    <div className="alert alert-danger">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="alert alert-success">
                                        {success}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Full Name
                                        </label>

                                        <input
                                            className="form-control"
                                            value={form.full_name}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    full_name: e.target.value
                                                })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            Email
                                        </label>

                                        <input
                                            type="email"
                                            className="form-control"
                                            value={form.email}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    email: e.target.value
                                                })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            Password
                                        </label>

                                        <input
                                            type="password"
                                            className="form-control"
                                            value={form.password}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    password: e.target.value
                                                })
                                            }
                                            minLength={8}
                                            required
                                        />
                                    </div>

                                    <button
                                        className="btn btn-primary w-100"
                                        disabled={saving}
                                    >
                                        {saving
                                            ? "Creating..."
                                            : "Create Agent"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body">
                                <h5 className="fw-bold mb-3">
                                    Agent Directory
                                </h5>

                                {loading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary" />
                                    </div>
                                ) : agents.length === 0 ? (
                                    <p className="text-muted">
                                        No agents found.
                                    </p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table align-middle">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Role</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {agents.map((agent) => (
                                                    <tr key={agent.user_id}>
                                                        <td>
                                                            {agent.full_name}
                                                        </td>
                                                        <td>
                                                            {agent.email}
                                                        </td>
                                                        <td>
                                                            <span className="badge text-bg-primary">
                                                                Agent
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
