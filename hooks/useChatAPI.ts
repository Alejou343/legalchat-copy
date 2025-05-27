import { useChat, type Message as VercelMessage } from "@ai-sdk/react";
import { toast } from "sonner"; // Assuming sonner is used for notifications
import type { ChatMode } from "./useChatMode"; // Assuming ChatMode type is exported

interface UseChatAPIProps {
    chatMode: ChatMode;
    hasFile: boolean;
    email: string;
    onSuccess?: (message: VercelMessage) => void;
    onError?: (error: Error) => void;
}

/**
 * Custom hook to encapsulate Vercel's useChat hook and related logic.
 * @param props - Configuration for the chat API.
 * @returns The state and methods from useChat, plus derived loading states.
 */
export function useChatAPI({ chatMode, hasFile, email, onSuccess, onError }: UseChatAPIProps) {
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
            hasFile,
            email
        },
        onError: (error) => {
            console.error("Chat API Error:", error);
            toast.error(error.message || "An error occurred with the chat API.");
            onError?.(error);
        },
        onFinish: (message) => {
            onSuccess?.(message);
        },
        experimental_throttle: 150, // Adjust as needed
    });

    // Derived state: Is the chat waiting for a response or streaming?
    
    const isStreaming = status === "streaming";
    const isSubmitted = status === "submitted";
    const isLoading = isSubmitted;

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
