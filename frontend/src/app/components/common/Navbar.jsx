
"use client";

import { useAuth } from "../../context/AuthContext";
import NotificationsBell from "./NotificationsBell";
import { Search } from "lucide-react";

export default function Navbar() {
    const { user } = useAuth();

    const fullName = user?.full_name || "User";
    const role = user?.role || "customer";

    const initial = fullName.charAt(0).toUpperCase();

    return (
        <nav className="navbar bg-white border-bottom px-3 px-md-4 py-3">
            <div className="container-fluid p-0">

                {/* Left section */}
                <div className="d-flex align-items-center gap-3 flex-grow-1">

                    <div className="d-none d-md-flex align-items-center bg-light rounded-3 px-3 py-2"
                        style={{ width: "280px" }}>

                        <Search
                            size={18}
                            className="text-muted me-2"
                        />

                        <input
                            type="search"
                            className="form-control border-0 bg-transparent shadow-none p-0"
                            placeholder="Search..."
                            aria-label="Search"
                        />
                    </div>

                    <div className="d-md-none">
                        <h5 className="fw-bold mb-0 text-primary">
                            HelpDesk Pro
                        </h5>
                    </div>

                </div>

                {/* Right section */}
                <div className="d-flex align-items-center gap-3">

                    <NotificationsBell />

                    <div className="text-end d-none d-sm-block">
                        <div className="fw-semibold text-dark">
                            {fullName}
                        </div>

                        <small className="text-muted text-capitalize">
                            {role}
                        </small>
                    </div>

                    <div
                        className="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center fw-bold"
                        style={{
                            width: "40px",
                            height: "40px",
                            minWidth: "40px",
                            fontSize: "16px"
                        }}
                    >
                        {initial}
                    </div>

                </div>

            </div>
        </nav>
    );
}
