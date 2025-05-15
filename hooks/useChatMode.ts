import { useState, useCallback } from "react";

export type ChatMode = "default" | "workflow";

/**
 * Custom hook to manage the chat mode.
 * @param initialMode - The initial chat mode ("default" or "workflow").
 * @returns An object containing the current chatMode, a function to toggle it, and a function to set it directly.
 */
export function useChatMode(initialMode: ChatMode = "default") {
    const [chatMode, setChatMode] = useState<ChatMode>(initialMode);

    const toggleChatMode = useCallback(() => {
        setChatMode(prevMode => (prevMode === "default" ? "workflow" : "default"));
    }, []);

    return { chatMode, toggleChatMode, setChatMode };
}
