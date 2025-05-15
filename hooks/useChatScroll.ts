import { useEffect, useRef, useState } from "react";

/**
 * Custom hook to manage auto-scrolling of a chat message area.
 * @param dependencies - An array of dependencies that trigger scroll (e.g., messages list).
 * @param isLoading - Boolean indicating if new content is currently loading/streaming.
 * @returns Refs for the scrollable area and the messages end anchor.
 */

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export  function useChatScroll(dependencies: any[], isLoading: boolean) {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null); // Anchor at the end of messages
    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

    // Effect to detect if user has manually scrolled up
    useEffect(() => {
        const scrollElement = scrollAreaRef.current;

        const handleScroll = () => {
            if (scrollElement) {
                const { scrollTop, scrollHeight, clientHeight } = scrollElement;
                // Check if scrolled to the bottom (with a small tolerance)
                const atBottom = scrollHeight - scrollTop - clientHeight < 20;
                setUserHasScrolledUp(!atBottom);
            }
        };

        scrollElement?.addEventListener("scroll", handleScroll);
        return () => scrollElement?.removeEventListener("scroll", handleScroll);
    }, []);

    // Effect to scroll to bottom when new messages arrive or loading starts,
    // but only if the user hasn't scrolled up.
    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
            useEffect(() => {
        if (!userHasScrolledUp && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dependencies, isLoading, userHasScrolledUp]); // userHasScrolledUp is intentionally in deps

     // When loading stops, if user was at bottom, ensure they stay there.
     // This handles cases where content loads and changes scrollHeight.
    useEffect(() => {
        if (!isLoading && !userHasScrolledUp && messagesEndRef.current) {
             messagesEndRef.current.scrollIntoView({ behavior: "auto" }); // Use auto for instant snap
        }
    }, [isLoading, userHasScrolledUp]);


    return { scrollAreaRef, messagesEndRef };
}
