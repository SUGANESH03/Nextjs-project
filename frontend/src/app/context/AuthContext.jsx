
"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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

                // Restore user immediately from saved session
                if (savedUser?.role && active) {
                    setUser(savedUser);
                }

                // Verify token with backend
                const response = await authService.getProfile();

                const currentUser = response.user || response;

                if (active && currentUser?.role) {
                    setUser(currentUser);

                    localStorage.setItem(
                        "user",
                        JSON.stringify(currentUser)
                    );
                }
            } catch (error) {
                console.error("Session restoration failed:", error);

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
    const logout = () => {
        setUser(null);
        authService.logout();
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
