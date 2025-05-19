import type React from "react";
import { ScrollArea } from "@/components/ui/scroll-area"; // Assuming Shadcn UI
import { Message } from "@/components/message"; // Assuming your existing Message component
import { ThreeDotLoader } from "@/components/ThreeDotLoader"; // Assuming existing
import type { DisplayMessage } from "@/hooks/useMessageManager"; // Path to your hook
import type { LucideIcon } from "lucide-react";

interface MessageListProps {
    scrollAreaRef: React.RefObject<HTMLDivElement>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    displayMessages: DisplayMessage[];
    isLoading: boolean; // General loading state
    isLastUserMessage: boolean; // True if the last message in displayMessages is from the user
    chatMode: "default" | "workflow";
    onEditMessage: (id: string) => void;
    icons: {
        Scale: LucideIcon; // For the loading indicator icon
    };
}

/**
 * Renders the list of chat messages and loading indicators.
 */
export const MessageList: React.FC<MessageListProps> = ({
    scrollAreaRef,
    messagesEndRef,
    displayMessages,
    isLoading,
    isLastUserMessage,
    chatMode,
    onEditMessage,
    icons,
}) => {
    const { Scale } = icons;
    return (
        <ScrollArea
            // @ts-ignore // TODO: Fix type for ScrollArea ref if it's not HTMLDivElement directly
            ref={scrollAreaRef}
            className="flex-grow p-4 overflow-y-auto"
            // onScroll={handleScroll} // If manual scroll detection is needed here
        >   
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
                {displayMessages.map((message, index) =>
                    message && ( // Ensure message object exists
                        <Message // Your existing Message component
                            key={message.id || `msg-${index}`} // Fallback key, ensure IDs are stable
                            message={message}
                            index={index}
                            onEdit={onEditMessage} // Pass the edit handler
                            // Pass any other props your Message component needs
                        />
                    )
                )}

                {/* Loading indicator for assistant response in default mode */}
                {isLoading && chatMode !== 'workflow' && (
                    <div className="flex flex-row gap-2 items-start mt-4">
                        <div className="size-[24px] flex justify-center items-center flex-shrink-0 text-zinc-500 mt-1">
                            <Scale />
                        </div>
                        <div className="flex flex-col gap-1 text-zinc-500 bg-muted rounded-md px-3 py-2">
                            <ThreeDotLoader />
                        </div>
                    </div>
                )}
                {/* Workflow mode might have its own specific streaming/loading indicator within the Message component if data streams into it */}
            </div>
            <div ref={messagesEndRef} /> {/* Anchor for scrolling to bottom */}
        </ScrollArea>
    );
};
