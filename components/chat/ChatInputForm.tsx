import type React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"; // Assuming utility
import type { LucideIcon } from "lucide-react";

interface ChatInputFormProps {
    input: string;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    isSubmitting: boolean;
    isLoading: boolean; // General loading state for disabling fields
    editingMessageId: string | null;
    selectedFile: File | null;
    chatMode: "default" | "workflow";
    onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onFormSubmit: (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onUploadButtonClick: () => void;
    onToggleChatMode: () => void;
    onCancelEdit: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void; // For the hidden input
    icons: {
        Upload: LucideIcon;
        Wand2: LucideIcon;
        Gavel: LucideIcon;
    };
}

/**
 * The chat input form including textarea, send button, and action buttons.
 */
export const ChatInputForm: React.FC<ChatInputFormProps> = ({
    input,
    textareaRef,
    isSubmitting,
    isLoading,
    editingMessageId,
    selectedFile,
    chatMode,
    onInputChange,
    onFormSubmit,
    onKeyDown,
    onUploadButtonClick,
    onToggleChatMode,
    onCancelEdit,
    fileInputRef,
    onFileSelected,
    icons,
}) => {
    const { Upload, Wand2, Gavel } = icons;
    const canSubmit = !isLoading && (input.trim() || selectedFile);

    return (
        <form
            className="flex flex-col gap-2 relative items-center mx-auto w-full max-w-4xl py-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            onSubmit={onFormSubmit}
        >
            <div className="flex items-end w-full gap-2 px-2 md:px-0"> {/* items-end for better alignment with multiline textarea */}
                {/* Hidden file input, triggered by the Upload button */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={onFileSelected}
                    // Consider adding 'accept' attribute for specific file types
                    // accept=".pdf,.doc,.docx,.txt"
                />

                {/* Upload File Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="transition-colors flex-shrink-0"
                            onClick={onUploadButtonClick}
                            disabled={isLoading || editingMessageId !== null}
                            aria-label="Upload File"
                        >
                            <Upload className="size-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Upload File</p></TooltipContent>
                </Tooltip>

                {/* Workflow Mode Toggle Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant={chatMode === "workflow" ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                                "transition-colors flex-shrink-0",
                                chatMode === "workflow" && "bg-primary text-primary-foreground hover:bg-primary/90",
                            )}
                            onClick={onToggleChatMode}
                            disabled={isLoading || editingMessageId !== null}
                            aria-label="Toggle Workflow Mode"
                        >
                            <Wand2 className="size-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>{chatMode === "workflow" ? "Workflow mode enabled" : "Switch to workflow mode"}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Message Input Area */}
                <div className="flex-grow relative">
                    <Textarea
                        ref={textareaRef}
                        className={cn(
                            "w-full min-h-[40px] max-h-[200px] resize-none pr-10 py-2 text-base bg-muted/60 rounded-lg border-border shadow-inner focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-shadow",
                            editingMessageId && "ring-2 ring-primary/40",
                            selectedFile && "ring-2 ring-blue-500/40", // Indicate file is selected
                            "placeholder:text-muted-foreground/70"
                        )}
                        placeholder={
                            editingMessageId
                                ? "Edit your message..."
                                : selectedFile
                                    ? `Continue with file: ${selectedFile.name}`
                                    : chatMode === "workflow"
                                        ? "Describe your legal task..."
                                        : "Type your message..."
                        }
                        value={input}
                        onChange={onInputChange}
                        onKeyDown={onKeyDown}
                        rows={1} // Start with 1 row, auto-resize will handle expansion
                        disabled={isLoading}
                        autoFocus
                    />
                    {/* Send Button (conditionally rendered or disabled) */}
                     <button
                        type="submit"
                        className={cn(
                            "absolute bottom-2 right-2 p-1 rounded-full bg-primary text-primary-foreground shadow transition-opacity",
                            (!canSubmit || isSubmitting) && "opacity-50 pointer-events-none",
                        )}
                        aria-label="Send Message"
                        disabled={!canSubmit || isSubmitting}
                    >
                        <Gavel size={18} />
                    </button>
                </div>
            </div>

            {/* Editing State Indicator & Cancel Button */}
            {editingMessageId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground w-full px-3">
                    <span>Editing message...</span>
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="px-0 h-auto text-primary hover:text-primary/80"
                        onClick={onCancelEdit}
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </form>
    );
};
