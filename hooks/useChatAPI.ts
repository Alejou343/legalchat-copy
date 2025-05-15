import { useChat, type Message as VercelMessage } from "@ai-sdk/react";
import { toast } from "sonner"; // Assuming sonner is used for notifications
import type { ChatMode } from "./useChatMode"; // Assuming ChatMode type is exported

interface UseChatAPIProps {
    chatMode: ChatMode;
    resource_id: string | null;
    onSuccess?: (message: VercelMessage) => void;
    onError?: (error: Error) => void;
}

/**
 * Custom hook to encapsulate Vercel's useChat hook and related logic.
 * @param props - Configuration for the chat API.
 * @returns The state and methods from useChat, plus derived loading states.
 */
export function useChatAPI({ chatMode, resource_id, onSuccess, onError }: UseChatAPIProps) {
    const {
        messages,
        input,
        handleInputChange,
        setInput,
        setMessages,
        data,
        status,
        append,
        reload,
        stop,
    } = useChat({
        api: "/api/chat", // Ensure your API endpoint is correct
        body: {
            mode: chatMode,
            resource_id: resource_id || '', // Send mode and resource_id to the backend
        },
        onError: (error) => {
            console.error("Chat API Error:", error);
            toast.error(error.message || "An error occurred with the chat API.");
            onError?.(error);
        },
        onFinish: (message) => {
            // This onFinish is for the entire stream.
            // Individual message processing (like cleaning markdown) might be better in useMessageManager
            // or if it's a final transformation before display.
            onSuccess?.(message);
        },
    });

    // Derived state: Is the chat waiting for a response or streaming?
    const isLoading = status === "streaming" || (status === "submitted" && chatMode === "workflow");
    const isStreaming = status === "streaming";
    const isSubmitted = status === "submitted";


    return {
        messages,
        input,
        handleInputChange,
        setInput,
        setMessages,
        data,
        status,
        append,
        reload,
        stop,
        isLoading,
        isStreaming,
        isSubmitted,
    };
}
