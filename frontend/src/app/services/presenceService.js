
import api from "./api";

const presenceService = {
    setOnline: async () => {
        const response = await api.post("/presence/online");
        return response.data;
    },

    setOffline: async () => {
        const response = await api.post("/presence/offline");
        return response.data;
    },

    heartbeat: async () => {
        const response = await api.post("/presence/heartbeat");
        return response.data;
    },

    getAll: async () => {
        const response = await api.get("/presence");
        return response.data;
    }
};

export default presenceService;