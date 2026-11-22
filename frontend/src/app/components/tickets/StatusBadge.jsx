
"use client";

export default function StatusBadge({ status }) {
    const statusColors = {
        open: "primary",
        assigned: "info",
        in_progress: "warning",
        resolved: "success",
        closed: "secondary",
        reopened: "danger"
    };

    const normalizedStatus = (status || "open").toLowerCase();

    return (
        <span className={`badge bg-${statusColors[normalizedStatus] || "secondary"}`}>
            {normalizedStatus.replaceAll("_", " ").toUpperCase()}
        </span>
    );
}
