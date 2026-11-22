
import api from "./api";

const ticketService = {
    // GET ALL TICKETS
    getAll: async () => {
        const response = await api.get("/tickets");
        return response.data;
    },

    // GET SINGLE TICKET
    getById: async (id) => {
        const response = await api.get(`/tickets/${id}`);
        return response.data;
    },

    // CREATE TICKET
    create: async (ticketData) => {
        const response = await api.post("/tickets", ticketData);
        return response.data;
    },

    // GET CLARIFICATIONS
    getClarifications: async (ticketId) => {
        const response = await api.get(
            `/tickets/${ticketId}/clarifications`
        );
        return response.data;
    },

    // REQUEST CLARIFICATION
    requestClarification: async (ticketId, question) => {
        const response = await api.post(
            `/tickets/${ticketId}/clarifications`,
            { question }
        );
        return response.data;
    },

    // RESPOND TO CLARIFICATION
    respondToClarification: async (
        ticketId,
        clarificationId,
        responseText
    ) => {
        const response = await api.post(
            `/tickets/${ticketId}/clarifications/${clarificationId}/respond`,
            { response: responseText }
        );
        return response.data;
    },

    // MANAGER RESUMES ON HOLD TICKET
    resume: async (ticketId) => {
        const response = await api.patch(
            `/tickets/${ticketId}/resume`
        );
        return response.data;
    },

    // ASSIGN TICKET
    assign: async (ticketId, agentId) => {
        const response = await api.post(
            `/tickets/${ticketId}/assign`,
            { agent_id: Number(agentId) }
        );
        return response.data;
    },

    // CLAIM TICKET
    claim: async (ticketId) => {
        const response = await api.post(
            `/tickets/${ticketId}/claim`
        );
        return response.data;
    },

    // UPDATE STATUS
    updateStatus: async (ticketId, status) => {
        const response = await api.patch(
            `/tickets/${ticketId}/status`,
            { status }
        );
        return response.data;
    },

    // GET TICKET ACTIVITIES
    getActivities: async (ticketId) => {
        const response = await api.get(
            `/tickets/${ticketId}/activities`
        );
        return response.data;
    },

    // CUSTOMER: REQUEST TICKET REOPENING
    requestReopen: async (ticketId, reason) => {
        const response = await api.post(
            `/reopen-requests/${ticketId}`,
            { reason }
        );
        return response.data;
    },

    // CUSTOMER: GET OWN REOPEN REQUESTS
    getMyReopenRequests: async () => {
        const response = await api.get(
            "/reopen-requests/my-requests"
        );
        return response.data;
    },

    // MANAGER: GET ALL REOPEN REQUESTS
    getReopenRequests: async () => {
        const response = await api.get(
            "/reopen-requests"
        );
        return response.data;
    },

    // MANAGER: APPROVE OR REJECT REOPEN REQUEST
    reviewReopenRequest: async (
        requestId,
        decision,
        managerComment = ""
    ) => {
        const response = await api.patch(
            `/reopen-requests/${requestId}/review`,
            {
                decision,
                manager_comment: managerComment
            }
        );
        return response.data;
    }
};

export default ticketService;
