
import api from "./api";

const authService = {
    register: async (userData) => {
        const response = await api.post("/auth/register", userData);
        return response.data;
    },

    login: async (credentials) => {
        console.log("Login started");

        const response = await api.post("/auth/login", credentials);
        const data = response.data;

        console.log("Backend response:", {
            hasToken: Boolean(data.accessToken || data.access_token),
            user: data.user
        });

        const token =
            data.accessToken ||
            data.access_token ||
            data.token;

        const user = data.user;

        if (!token || !user) {
            throw new Error("Token or user missing from backend response");
        }

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        console.log("Token saved:", Boolean(localStorage.getItem("token")));

        return {
            ...data,
            accessToken: token,
            user
        };
    },

    getProfile: async () => {
        const response = await api.get("/auth/profile");
        return response.data;
    },

    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.replace("/login");
    },

    getCurrentUser: () => {
        if (typeof window === "undefined") return null;

        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    },

    isAuthenticated: () => {
        if (typeof window === "undefined") return false;

        return Boolean(localStorage.getItem("token"));
    }
};

export default authService;
