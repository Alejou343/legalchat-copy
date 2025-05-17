/* eslint-disable @next/next/no-img-element */
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip"; // Assuming this is Shadcn UI
import { Scale, Wand2, Gavel, Upload, CheckCircle2 } from "lucide-react";

// Custom Hooks
import { useChatMode, type ChatMode } from "@/hooks/useChatMode";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
	useMessageManager,
	type DisplayMessage,
} from "@/hooks/useMessageManager";
import { useChatAPI } from "@/hooks/useChatAPI";
import { useChatSubmit } from "@/hooks/useChatSubmit";
import { useTextareaAutoResize } from "@/hooks/useTextareaAutoResize";
import { useChatScroll } from "@/hooks/useChatScroll";

// Child Components
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInputForm } from "@/components/chat/ChatInputForm";
import { UploadSuccessNotification } from "@/components/chat/UploadSuccessNotification";
import FileDisplay from "@/components/FileDisplay";
import { toast } from "sonner";

export default function ChatPage() {
	// --- Custom Hooks ---
	const { chatMode, toggleChatMode } = useChatMode("default");
	const [ hasFile, setHasFile ] = useState(false);

	
	const {
		selectedFile,
		setSelectedFile,
		filePreview,
		setFilePreview,
		handleFileChange,
		handleClearSelectedFile,
		triggerFileInputClick,
		fileInputRef,
		uploadSuccess,
		setUploadSuccess,
	} = useFileUpload();
	
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
		useEffect(()=>{
		if(!hasFile && uploadSuccess){
			setHasFile(true);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uploadSuccess]);

	const chatAPI = useChatAPI({
		// Encapsulates Vercel's useChat
		chatMode,
		hasFile,
		onSuccess: () => {
			setSelectedFile(null); // Clear selected file after successful assistant response
			setFilePreview(null); // Clear preview as well
		},
		onError: (error) => {
			setSelectedFile(null); // Clear selected file on error
			setFilePreview(null);
		},
	});

	const {
		displayMessages,
		editingMessageId,
		setEditingMessageId,
		addOptimisticUserMessage,
		updateOptimisticUserMessage,
		syncMessagesFromAPI,
	} = useMessageManager({
		apiMessages: chatAPI.messages,
		apiData: chatAPI.data,
		chatMode: chatMode,
	});

	// Effect to sync API messages to displayMessages
	useEffect(() => {
		syncMessagesFromAPI(chatAPI.messages, chatAPI.data);
	}, [chatAPI.messages, chatAPI.data, syncMessagesFromAPI]);

	const textareaRef = useTextareaAutoResize(chatAPI.input, 40, 200);
	const { scrollAreaRef, messagesEndRef } = useChatScroll(
		displayMessages,
		chatAPI.isLoading,
	);

	const { handleFormSubmit, handleInitiateEdit } = useChatSubmit({
		input: chatAPI.input,
		setInput: chatAPI.setInput,
		selectedFile,
		setSelectedFile,
		setFilePreview,
		editingMessageId,
		setEditingMessageId,
		displayMessages,
		addOptimisticUserMessage,
		updateOptimisticUserMessage,
		appendToApi: async (message, options) => {
			// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
			let result;
			if (typeof message.content === "string") {
				result = await chatAPI.append({
					role: message.role,
					content: message.content
				});
			} else if (Array.isArray(message.content)) {
				result = await chatAPI.append({
					role: message.role,
					content: message.content[0].text ?? "",
					parts: [
						{ type: "text", text: message.content[0].text ?? "" },
						{
							type: "file",
							mimeType: message.content[1].mimeType ?? "",
							data: message.content[1].data ?? "",
						},
					],
				}, options);
			}

			return result === null ? undefined : result;
		},
		setApiMessages: chatAPI.setMessages, // For clearing context on edit
		isLoading: chatAPI.isLoading,
		setUploadSuccess, // To trigger success animation
		// readFileAsDataURL, // Pass the utility
	});

	// --- Event Handlers ---
	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		chatAPI.handleInputChange(e); // Handles input state
		// Textarea resize is handled by useTextareaAutoResize hook via chatAPI.input dependency
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (!chatAPI.isLoading && (chatAPI.input.trim() || selectedFile)) {
				// Create a synthetic event or directly call
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				handleFormSubmit(e as any); // Cast if directly passing keyboard event
			}
		}
	};

	const cancelEdit = () => {
		setEditingMessageId(null);
		chatAPI.setInput("");
		setSelectedFile(null);
		setFilePreview(null);
	};

	return (
		<TooltipProvider delayDuration={100}>
			<div className="flex flex-col justify-center items-center h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] w-full">
				<div className="flex flex-col justify-between w-full h-full bg-background">
					{displayMessages.length === 0 && !chatAPI.isLoading ? (
						<WelcomeScreen chatMode={chatMode} icons={{ Scale, Wand2 }} />
					) : (
						<MessageList
							scrollAreaRef={scrollAreaRef}
							messagesEndRef={messagesEndRef}
							displayMessages={displayMessages}
							isLoading={chatAPI.isLoading}
							isLastUserMessage={
								displayMessages[displayMessages.length - 1]?.role === "user"
							}
							chatMode={chatMode}
							onEditMessage={handleInitiateEdit}
							icons={{ Scale }} // Pass Scale icon for loader
						/>
					)}

					{filePreview && ( // Use filePreview for the UI element
						<FileDisplay
							selectedFile={selectedFile}
							handleClearFile={handleClearSelectedFile}
						/>
					)}

					<UploadSuccessNotification
						uploadSuccess={uploadSuccess}
						icons={{ CheckCircle2 }}
					/>

					<ChatInputForm
						input={chatAPI.input}
						textareaRef={textareaRef}
						isSubmitting={chatAPI.status === "submitted"} // Or a more specific state from useChatSubmit if created
						isLoading={chatAPI.isLoading}
						editingMessageId={editingMessageId}
						selectedFile={selectedFile}
						chatMode={chatMode}
						onInputChange={handleTextareaChange}
						onFormSubmit={handleFormSubmit}
						onKeyDown={handleKeyDown}
						onUploadButtonClick={triggerFileInputClick}
						onToggleChatMode={toggleChatMode}
						onCancelEdit={cancelEdit}
						fileInputRef={fileInputRef} // For connecting button to hidden input
						onFileSelected={handleFileChange} // Pass the actual file change handler
						icons={{ Upload, Wand2, Gavel }}
					/>
				</div>
			</div>
		</TooltipProvider>
	);
}