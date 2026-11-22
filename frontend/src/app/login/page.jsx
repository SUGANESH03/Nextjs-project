
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const user = await login(formData);
            const role = user.role?.toLowerCase();

            if (role === "manager") {
                router.replace("/manager/dashboard");
            } else if (role === "agent") {
                router.replace("/agent/dashboard");
            } else if (role === "customer") {
                router.replace("/customer/dashboard");
            } else {
                setError("Invalid user role");
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="row shadow-lg rounded-4 overflow-hidden bg-white w-100"
                style={{ maxWidth: "950px" }}>

                <div className="col-md-6 p-5 text-white"
                    style={{ background: "#172554" }}>

                    <h2 className="fw-bold mb-3">HelpDesk Pro</h2>

                    <p className="text-light mb-5">
                        Enterprise Ticket Management System
                    </p>

                    <h3 className="fw-bold">
                        Support made simple.
                    </h3>

                    <p className="mt-3 text-light">
                        Manage support requests, communicate with
                        your team and resolve issues efficiently.
                    </p>

                    <div className="mt-5">
                        <div className="mb-3">✓ Real-time ticket tracking</div>
                        <div className="mb-3">✓ Secure role-based access</div>
                        <div className="mb-3">✓ Centralized notifications</div>
                        <div>✓ Faster issue resolution</div>
                    </div>
                </div>

                <div className="col-md-6 p-5">
                    <h3 className="fw-bold mb-2">Welcome Back</h3>

                    <p className="text-secondary mb-4">
                        Sign in to continue to your account.
                    </p>

                    {error && (
                        <div className="alert alert-danger">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Email Address
                            </label>

                            <input
                                type="email"
                                name="email"
                                className="form-control form-control-lg"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-semibold">
                                Password
                            </label>

                            <input
                                type="password"
                                name="password"
                                className="form-control form-control-lg"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-100"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <p className="text-center mt-4 text-secondary">
                        New customer?{" "}
                        <Link href="/register"
                            className="fw-semibold text-primary">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
