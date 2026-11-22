
import api from "./api";

const reopenRequestService = {
    create: async (ticketId, reason) => {
        const response = await api.post(
            `/reopen-requests/${ticketId}`,
            { reason }
        );
        return response.data;
    },

    getAll: async () => {
        const response = await api.get("/reopen-requests");
        return response.data;
    },

    getMyRequests: async () => {
        const response = await api.get(
            "/reopen-requests/my-requests"
        );
        return response.data;
    },

    review: async (id, status, managerComment = "") => {
        const response = await api.patch(
            `/reopen-requests/${id}/review`,
            {
                status,
                manager_comment: managerComment
            }
        );

        return response.data;
    }
};

export default reopenRequestService;
