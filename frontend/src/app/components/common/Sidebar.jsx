
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    LayoutDashboard,
    Ticket,
    Users,
    Bell,
    RotateCcw,
    PlusCircle,
    LogOut,
    Headset
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const role = user?.role?.toLowerCase();

    const menus = {
        customer: [
            {
                name: "Dashboard",
                path: "/customer/dashboard",
                icon: LayoutDashboard
            },
            {
                name: "My Tickets",
                path: "/customer/tickets",
                icon: Ticket
            },
            {
                name: "Create Ticket",
                path: "/customer/tickets/create-ticket",
                icon: PlusCircle
            },
            {
                name: "Notifications",
                path: "/customer/notifications",
                icon: Bell
            }
        ],

        agent: [
            {
                name: "Dashboard",
                path: "/agent/dashboard",
                icon: LayoutDashboard
            },
            {
                name: "Assigned Tickets",
                path: "/agent/tickets",
                icon: Ticket
            },
            {
                name: "Notifications",
                path: "/agent/notifications",
                icon: Bell
            }
        ],

        manager: [
            {
                name: "Dashboard",
                path: "/manager/dashboard",
                icon: LayoutDashboard
            },
            {
                name: "All Tickets",
                path: "/manager/tickets",
                icon: Ticket
            },
            {
                name: "Manage Agents",
                path: "/manager/agents",
                icon: Users
            },
            {
                name: "Reopen Requests",
                path: "/manager/reopen-requests",
                icon: RotateCcw
            },
            {
                name: "Notifications",
                path: "/manager/notifications",
                icon: Bell
            }
        ]
    };

    const currentMenus = menus[role] || [];

    return (
        <aside
            className="d-flex flex-column text-white"
            style={{
                width: "260px",
                minHeight: "100vh",
                background: "#172554",
                flexShrink: 0
            }}
        >
            {/* Brand */}
            <div className="p-4 border-bottom border-secondary">
                <div className="d-flex align-items-center gap-2">
                    <Headset size={30} />

                    <h4 className="fw-bold mb-0">
                        HelpDesk Pro
                    </h4>
                </div>

                <small className="text-white-50">
                    Ticket Management
                </small>
            </div>

            {/* Navigation */}
            <div className="p-3 flex-grow-1">
                <small className="text-white-50 px-2">
                    MAIN MENU
                </small>

                <nav className="mt-3 d-flex flex-column gap-2">
                    {currentMenus.map((item) => {
                        const Icon = item.icon;

                        const active =
                            pathname === item.path ||
                            (
                                item.path !== "/customer/tickets" &&
                                item.path !== "/manager/tickets" &&
                                pathname.startsWith(item.path + "/")
                            );

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className="d-flex align-items-center gap-3 px-3 py-3 rounded-3 text-decoration-none"
                                style={{
                                    color: "white",
                                    background: active
                                        ? "#2563eb"
                                        : "transparent"
                                }}
                            >
                                <Icon size={19} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User information */}
            <div className="p-3 border-top border-secondary">
                <div className="mb-3 px-2">
                    <div className="fw-semibold">
                        {user?.full_name || "User"}
                    </div>

                    <small className="text-white-50 text-capitalize">
                        {role || "User"}
                    </small>
                </div>

                <button
                    onClick={logout}
                    className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2"
                >
                    <LogOut size={17} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
