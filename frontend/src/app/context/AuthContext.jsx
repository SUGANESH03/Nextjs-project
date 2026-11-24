"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import authService from "../services/authService";

const AuthContext = createContext(null);

const API_URL = "http://localhost:4000/api";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Update backend presence
    const updatePresence = async (status) => {
        const token = localStorage.getItem("token");

        if (!token) return;

        try {
            await fetch(`${API_URL}/presence/${status}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            });
        } catch (error) {
            console.error(
                `Failed to update ${status} status:`,
                error
            );
        }
    };

    // Restore existing login session
    useEffect(() => {
        let active = true;

        const restoreSession = async () => {
            try {
                const savedUser = authService.getCurrentUser();
                const tokenExists = authService.isAuthenticated();

                if (!tokenExists) {
                    if (active) setUser(null);
                    return;
                }

                if (savedUser?.role && active) {
                    setUser(savedUser);
                }

                const response = await authService.getProfile();

                const currentUser = response.user || response;

                if (active && currentUser?.role) {
                    setUser(currentUser);

                    localStorage.setItem(
                        "user",
                        JSON.stringify(currentUser)
                    );

                    await updatePresence("online");
                }
            } catch (error) {
                console.error(
                    "Session restoration failed:",
                    error
                );

                if (active) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        restoreSession();

        return () => {
            active = false;
        };
    }, []);

    // Login
    const login = async (credentials) => {
        setLoading(true);

        try {
            const response = await authService.login(credentials);

            const loggedInUser = response.user;

            if (!loggedInUser?.role) {
                throw new Error("Invalid user information");
            }

            setUser(loggedInUser);

            await updatePresence("online");

            return loggedInUser;
        } finally {
            setLoading(false);
        }
    };

    // Register
    const register = async (userData) => {
        return await authService.register(userData);
    };

    // Logout
    const logout = async () => {
        try {
            // Update presence BEFORE removing the token
            await updatePresence("offline");
        } catch (error) {
            console.error("Logout presence error:", error);
        } finally {
            setUser(null);
            authService.logout();
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                isAuthenticated: Boolean(user),
                role: user?.role?.toLowerCase() || null
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}
