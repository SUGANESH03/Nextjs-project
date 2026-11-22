
"use client";

import { useEffect } from "react";
import presenceService from "../../services/presenceService";

export default function PresenceTracker() {
    useEffect(() => {
        let heartbeatInterval;
        let active = true;

        const updateOnline = async () => {
            if (!active) return;

            try {
                await presenceService.heartbeat();
            } catch (error) {
                console.error("Presence update failed:", error);
            }
        };

        const startTracking = async () => {
            try {
                await presenceService.setOnline();

                if (!active) return;

                heartbeatInterval = setInterval(
                    updateOnline,
                    30000
                );
            } catch (error) {
                console.error("Unable to set online status:", error);
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                updateOnline();
            }
        };

        startTracking();

        document.addEventListener(
            "visibilitychange",
            handleVisibility
        );

        return () => {
            active = false;

            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }

            document.removeEventListener(
                "visibilitychange",
                handleVisibility
            );
        };
    }, []);

    return null;
}
