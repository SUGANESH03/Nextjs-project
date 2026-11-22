
import api from "./api";

const agentService = {
    getAll: async () => {
        const response = await api.get("/agents");
        return response.data;
    },

    create: async (data) => {
        const response = await api.post("/agents", data);
        return response.data;
    }
};

export default agentService;
