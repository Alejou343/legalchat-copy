import { useCallback } from "react";
import { toast } from "sonner";
import type { DisplayMessage } from "./useMessageManager.ts"; // Assuming type

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
        message: { role: "user"; content: string } | { role: "user"; content: Array<{type: string; text?: string; data?: string; mimeType?: string }> },
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        options?: { data?: any }
    ) => Promise<string | undefined>; // Vercel SDK's append returns string (messageId) or void
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    setApiMessages: (messages: any[]) => void; // Vercel's setMessages
    isLoading: boolean;
    setUploadSuccess: (success: boolean) => void;
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

        let fileDataForApi: { fileUrl: string } | null = null;
        if (currentFile) {
            try {
                const presignRes = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: currentFile.name, type: currentFile.type }),
                });

                if (!presignRes.ok) throw new Error("Failed to get upload URL");

                const { uploadUrl, fileUrl } = await presignRes.json();

                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": currentFile.type },
                    body: currentFile,
                });

                if (!uploadRes.ok) throw new Error("Failed to upload to S3");

                fileDataForApi = { fileUrl };
                setUploadSuccess(true); // Trigger success animation for file processing
            } catch (error) {
                console.error("Upload error:", error);
                toast.error("Error uploading file");
                setInput(currentInput);
                setSelectedFile(currentFile);
                if (currentFile) setFilePreview({ name: currentFile.name, type: currentFile.type });
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
        setApiMessages, appendToApi, setUploadSuccess
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
