import { useCallback } from "react";
import { toast } from "sonner";
import type { DisplayMessage } from "./useMessageManager.ts"; // Assuming type
import { readFileAsDataURL } from "@/lib/utils"; // Assuming utility

interface UseChatSubmitProps {
    input: string;
    setInput: (input: string) => void;
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    setFilePreview: (preview: { name: string; type: string } | null) => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    displayMessages: DisplayMessage[];
    addOptimisticUserMessage: (content: string, file?: File | null) => Promise<DisplayMessage>;
    updateOptimisticUserMessage: (messageId: string, newContent: string, newFile?: File | null) => Promise<void>;
    appendToApi: (
        message: { role: "user"; content: string },
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        options?: { data?: any }
    ) => Promise<string | undefined>; // Vercel SDK's append returns string (messageId) or void
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    setApiMessages: (messages: any[]) => void; // Vercel's setMessages
    isLoading: boolean;
    setUploadSuccess: (success: boolean) => void;
    // readFileAsDataURL: (file: File) => Promise<string | null>; // Pass utility
}

/**
 * Custom hook to handle chat message submission logic, including
 * new messages, edits, and file attachments.
 */
export function useChatSubmit({
    input,
    setInput,
    selectedFile,
    setSelectedFile,
    setFilePreview,
    editingMessageId,
    setEditingMessageId,
    displayMessages,
    addOptimisticUserMessage,
    updateOptimisticUserMessage,
    appendToApi,
    setApiMessages,
    isLoading,
    setUploadSuccess,
    // readFileAsDataURL,
}: UseChatSubmitProps) {

    const handleFormSubmit = useCallback(async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
        e?.preventDefault();
        if (isLoading || (!input.trim() && !selectedFile)) {
            return;
        }

        const currentInput = input;
        const currentFile = selectedFile;

        // Clear input and file selection immediately for better UX
        setInput("");
        setSelectedFile(null);
        setFilePreview(null);

        let fileDataForApi: { file: { name: string; type: string; content: string } } | null = null;
        if (currentFile) {
            try {
                const fileContent = await readFileAsDataURL(currentFile); // Use the passed utility
                if (fileContent) {
                    fileDataForApi = {
                        file: {
                            name: currentFile.name,
                            type: currentFile.type,
                            content: fileContent, // Sending as Data URL
                        },
                    };
                    setUploadSuccess(true); // Trigger success animation for file processing
                } else {
                    toast.error("Could not read the selected file.");
                    // Restore input if needed
                    setInput(currentInput);
                    setSelectedFile(currentFile);
                    if(currentFile) setFilePreview({name: currentFile.name, type: currentFile.type});
                    return;
                }
            } catch (error) {
                console.error("Error reading file:", error);
                toast.error("An error occurred while processing the file.");
                setInput(currentInput);
                setSelectedFile(currentFile);
                if(currentFile) setFilePreview({name: currentFile.name, type: currentFile.type});
                return;
            }
        }

        if (editingMessageId) {
            // --- Handle Editing Existing Message ---
            await updateOptimisticUserMessage(editingMessageId, currentInput, currentFile);
            setApiMessages([]); // Clear API messages to resend context from the edited point
            try {
                await appendToApi(
                    { role: "user", content: currentInput },
                    { data: fileDataForApi }
                );
            } catch (apiError) {
                console.error("Error sending edited message:", apiError);
                toast.error("Failed to send edited message.");
                // Potentially revert optimistic update or allow user to retry
            }
            setEditingMessageId(null);
        } else {
            // --- Handle New Message ---
            const optimisticMessage = await addOptimisticUserMessage(currentInput, currentFile);
            try {
                await appendToApi(
                    { role: "user", content: currentInput },
                    { data: fileDataForApi }
                );
            } catch (apiError) {
                console.error("Error sending new message:", apiError);
                toast.error("Failed to send message.");
                // Potentially remove optimistic message or mark as failed
                // setDisplayMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            }
        }
    }, [
        isLoading, input, selectedFile, editingMessageId,
        setInput, setSelectedFile, setFilePreview, setEditingMessageId,
        updateOptimisticUserMessage, addOptimisticUserMessage,
        setApiMessages, appendToApi, setUploadSuccess, /*readFileAsDataURL*/
    ]);

    const handleInitiateEdit = useCallback((messageId: string) => {
        if (isLoading) {
            toast.info("Please wait for the current response to finish before editing.");
            return;
        }
        const messageToEdit = displayMessages.find(msg => msg.id === messageId);
        if (messageToEdit && messageToEdit.role === "user") {
            setInput(messageToEdit.content);
            if (messageToEdit.file) {
                // Create a placeholder File object if you want to "re-select" it.
                // This is tricky as you can't programmatically set FileList.
                // For now, just indicate it was there. A better UX might involve showing the old file
                // and allowing replacement.
                // setSelectedFile(new File([messageToEdit.file.content || ""], messageToEdit.file.name, { type: messageToEdit.file.type }));
                // For simplicity, we'll clear any selected file and let user re-attach if they want to change it.
                setSelectedFile(null);
                setFilePreview(null);
                toast.info(`Editing message. File '${messageToEdit.file.name}' was attached. Re-attach if needed.`);
            } else {
                setSelectedFile(null);
                setFilePreview(null);
            }
            setEditingMessageId(messageId);
            // Focus logic can be handled in the ChatInputForm component via a prop or ref effect
        }
    }, [isLoading, displayMessages, setInput, setSelectedFile, setFilePreview, setEditingMessageId]);

    return { handleFormSubmit, handleInitiateEdit };
}
