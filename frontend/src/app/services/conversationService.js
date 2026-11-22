
import api from "./api";

const conversationService = {
    getMessages: async (ticketId) => {
        const response = await api.get(
            `/tickets/${ticketId}/messages`
        );

        return response.data;
    },

    sendMessage: async (ticketId, message, isPrivate = false) => {
        const response = await api.post(
            `/tickets/${ticketId}/messages`,
            {
                message: message.trim(),
                message_type: isPrivate ? "private" : "public"
            }
        );

        return response.data;
    }
};

export default conversationService;
