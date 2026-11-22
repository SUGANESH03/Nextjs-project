
"use client";

export default function Loading({
    message = "Loading...",
    fullScreen = false
}) {
    return (
        <div
            className={`d-flex flex-column justify-content-center align-items-center ${
                fullScreen ? "min-vh-100" : "py-5"
            }`}
        >
            <div
                className="spinner-border text-primary"
                role="status"
                style={{
                    width: "40px",
                    height: "40px"
                }}
            >
                <span className="visually-hidden">
                    Loading
                </span>
            </div>

            <p className="text-muted mt-3 mb-0">
                {message}
            </p>
        </div>
    );
}
