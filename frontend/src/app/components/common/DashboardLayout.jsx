
"use client";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import PresenceTracker from "./PresenceTracker";

export default function DashboardLayout({ children, title }) {
    return (
        <div className="d-flex min-vh-100 bg-light">

            {/* Automatic Online / Offline Tracking */}
            <PresenceTracker />

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div
                className="flex-grow-1 d-flex flex-column"
                style={{
                    minWidth: 0,
                    minHeight: "100vh"
                }}
            >
                {/* Navbar */}
                <Navbar />

                {/* Page Content */}
                <main className="p-3 p-md-4 flex-grow-1">
                    {title && (
                        <div className="mb-4">
                            <h4 className="fw-bold mb-1">
                                {title}
                            </h4>

                            <p className="text-muted mb-0">
                                Manage your support activities
                            </p>
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
