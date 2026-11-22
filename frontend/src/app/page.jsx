
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

export default function HomePage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace("/login");
            return;
        }

        switch (user.role) {
            case "customer":
                router.replace("/customer/dashboard");
                break;

            case "agent":
                router.replace("/agent/dashboard");
                break;

            case "manager":
                router.replace("/manager/dashboard");
                break;

            default:
                router.replace("/login");
        }
    }, [user, loading, router]);

    return (
        <div className="min-vh-100 d-flex justify-content-center align-items-center">
            <div className="text-center">
                <div
                    className="spinner-border text-primary mb-3"
                    role="status"
                />

                <h5 className="fw-semibold">
                    Loading HelpDesk Pro...
                </h5>

                <p className="text-secondary">
                    Preparing your dashboard
                </p>
            </div>
        </div>
    );
}
