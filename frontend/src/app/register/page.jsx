
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
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
        setSuccess("");

        if (formData.password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            await register(formData);

            setSuccess("Account created successfully!");

            setTimeout(() => {
                router.push("/login");
            }, 1200);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Registration failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">

            <div className="row bg-white shadow-lg rounded-4 overflow-hidden w-100"
                style={{ maxWidth: "950px" }}>

                <div className="col-md-5 p-5 text-white d-flex flex-column justify-content-center"
                    style={{ background: "#172554" }}>

                    <h2 className="fw-bold mb-3">HelpDesk Pro</h2>

                    <h3 className="fw-bold mt-4">
                        Join our support community.
                    </h3>

                    <p className="text-light mt-3">
                        Create your account to raise support tickets,
                        communicate with our support team and track
                        every issue in one place.
                    </p>

                    <div className="mt-4">
                        <p>✓ Easy ticket creation</p>
                        <p>✓ Track ticket progress</p>
                        <p>✓ Direct support communication</p>
                        <p>✓ Instant notifications</p>
                    </div>
                </div>

                <div className="col-md-7 p-5">

                    <h3 className="fw-bold mb-2">
                        Create Your Account
                    </h3>

                    <p className="text-secondary mb-4">
                        Enter your details to get started.
                    </p>

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
                            <label className="form-label fw-semibold">
                                Full Name
                            </label>

                            <input
                                type="text"
                                name="full_name"
                                className="form-control form-control-lg"
                                placeholder="Enter your full name"
                                value={formData.full_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

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

                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Phone Number
                            </label>

                            <input
                                type="tel"
                                name="phone"
                                className="form-control form-control-lg"
                                placeholder="Enter your phone number"
                                value={formData.phone}
                                onChange={handleChange}
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
                                placeholder="Minimum 8 characters"
                                value={formData.password}
                                onChange={handleChange}
                                minLength={8}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-100"
                            disabled={loading}
                        >
                            {loading
                                ? "Creating Account..."
                                : "Create Account"}
                        </button>

                    </form>

                    <p className="text-center mt-4 text-secondary">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="fw-semibold text-primary"
                        >
                            Sign In
                        </Link>
                    </p>

                </div>
            </div>
        </div>
    );
}
