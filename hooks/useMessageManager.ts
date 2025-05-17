/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback, useEffect } from "react";
import type { Message as VercelMessage } from "@ai-sdk/react";
// Assuming WorkflowData and ChatMode types are defined and exported elsewhere
import type { WorkflowData } from "@/components/workflow";
import { readFileAsDataURL } from "@/lib/utils";
import type { ChatMode } from "./useChatMode";

// Define your DisplayMessage type, which is used by the UI components
export interface DisplayMessage {
	id: string;
	content: string;
	role: "user" | "assistant";
	workflow: WorkflowData | null; // Replace 'any' with 'WorkflowData'
	file?: { name: string; type: string; content: string | null } | null;
	// Add other properties if needed, e.g., timestamp, reactions, etc.
}

interface UseMessageManagerProps {
	apiMessages: VercelMessage[];
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	apiData: any; // Data from useChat (contains workflow typically)
	chatMode: ChatMode;
	onDisplayMessagesChange?: (newDisplayMessages: DisplayMessage[]) => void;
}

/**
 * Custom hook to manage the local `displayMessages` state,
 * synchronize it with API messages, handle optimistic updates,
 * message editing, and other message-related logic.
 */
export function useMessageManager({
	apiMessages,
	apiData,
	chatMode,
	onDisplayMessagesChange,
}: UseMessageManagerProps) {
	const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

	// Optimistically add a user message to the display list
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const addOptimisticUserMessage = useCallback(
		async (
			content: string,
			file?: File | null,
			tempIdPrefix = "temp-user-",
		) => {
			const messageId = `${tempIdPrefix}${Date.now()}`;
			let fileData = null;
			if (file) {
				// Assuming readFileAsDataURL is available globally or passed in
				const fileContent = await readFileAsDataURL(file);
				fileData = {
					name: file.name,
					type: file.type,
					content: fileContent,
				};
			}
			const newUserMessage: DisplayMessage = {
				id: messageId,
				content,
				role: "user",
				workflow: null,
				file: fileData,
			};
			// console.log("Adding optimistic user message:", newUserMessage);
			setDisplayMessages((prev) => [...prev, newUserMessage]);
			onDisplayMessagesChange?.([...displayMessages, newUserMessage]);
			return newUserMessage; // Return for potential immediate use (e.g., getting the ID)
		},
		[],
	);

	// Optimistically update a user message (e.g., after an edit is submitted)
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const updateOptimisticUserMessage = useCallback(
		async (messageId: string, newContent: string, newFile?: File | null) => {
			let newFileData = null;
			if (newFile) {
				const fileContent = await readFileAsDataURL(newFile);
				newFileData = {
					name: newFile.name,
					type: newFile.type,
					content: fileContent,
				};
			}

			setDisplayMessages((prev) => {
				const messageIndex = prev.findIndex((msg) => msg.id === messageId);
				if (messageIndex === -1) return prev; // Should not happen if editing existing

				// Remove all messages after the one being edited, as context changes
				const updatedMessages = prev.slice(0, messageIndex + 1);
				updatedMessages[messageIndex] = {
					...updatedMessages[messageIndex],
					content: newContent,
					file:
						newFile === undefined
							? updatedMessages[messageIndex].file
							: newFileData, // Keep old if undefined, null if explicitly cleared
				};
				// console.log("Updating optimistic user message:", updatedMessages[messageIndex]);
				onDisplayMessagesChange?.(updatedMessages);
				return updatedMessages;
			});
		},
		[],
	);

	// Synchronize Vercel API messages with local displayMessages
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const syncMessagesFromAPI = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		(currentApiMessages: VercelMessage[], currentApiData: any) => {
			// This function needs to intelligently merge apiMessages into displayMessages.
			// It should handle:
			// 1. New assistant messages.
			// 2. Streaming updates to the last assistant message.
			// 3. Replacing temporary user messages with actual API messages if IDs change.
			// 4. Cleaning assistant messages (e.g., removing markdown).
			// 5. Handling workflow data.
			// 6. Removing duplicate consecutive assistant messages.

			setDisplayMessages((prevDisplayMessages) => {
				const newMessages = [...prevDisplayMessages];
				let changed = false;

				for (const apiMsg of currentApiMessages) {
					const existingMsgIndex = newMessages.findIndex(
						(dm) => dm.id === apiMsg.id,
					);
					let content = apiMsg.content;

					// Clean markdown bold from assistant messages
					if (apiMsg.role === "assistant") {
						content = content.replace(/(\*\*|__)(.*?)\1/g, "$2");
					}

					let displayMsgPayload: DisplayMessage = {
						id: apiMsg.id,
						content: content,
						role: apiMsg.role as "user" | "assistant",
						workflow:
							apiMsg.role === "assistant" && chatMode === "workflow"
								? currentApiData
								: null,
					};

					if (existingMsgIndex !== -1) {
						// Update existing message if content or workflow data changed
						if (
							newMessages[existingMsgIndex].content !== content ||
							(chatMode === "workflow" &&
								newMessages[existingMsgIndex].workflow !== currentApiData)
						) {
							if(newMessages[existingMsgIndex].file !== undefined){
								displayMsgPayload = {
									...displayMsgPayload,
									file: newMessages[existingMsgIndex].file
								}
							}
							newMessages[existingMsgIndex] = displayMsgPayload;
							changed = true;
						}
					} else {
						// Add new message. This typically happens for assistant messages.
						// User messages are added optimistically. If an API user message appears
						// that wasn't optimistic, it implies a state mismatch or reload.
						// A more robust solution might involve matching optimistic user messages
						// to API responses if IDs are correlated.
						const lastOptimisticUserMsg =
							newMessages.length > 0 &&
							newMessages[newMessages.length - 1].role === "user" &&
							newMessages[newMessages.length - 1].id.startsWith("temp-user-");

						if (
							apiMsg.role === "user" &&
							lastOptimisticUserMsg &&
							newMessages[newMessages.length - 1].content === apiMsg.content
						) {
							// Replace last optimistic user message with the one from API (which has the final ID)
                            if (newMessages[newMessages.length - 1].file){
                                displayMsgPayload.file = newMessages[newMessages.length - 1].file;
                            }
							newMessages[newMessages.length - 1] = displayMsgPayload;
						} else {
							newMessages.push(displayMsgPayload);
						}
						changed = true;
					}
				}

				// Remove duplicate consecutive assistant messages (if the last two are assistants and different)
				if (newMessages.length >= 2) {
					const last = newMessages[newMessages.length - 1];
					const secondLast = newMessages[newMessages.length - 2];
					if (
						last.role === "assistant" &&
						secondLast.role === "assistant" &&
						last.id !== secondLast.id
					) {
						// This logic might be too aggressive if streaming causes rapid distinct assistant messages.
						// The original code's intent was likely to clean up after a stream if it resulted in two separate messages.
						// A better approach might be to ensure the streaming message updates in place.
						// The current logic above (update existingMsgIndex) should handle streaming correctly.
						// This specific duplicate removal might only be needed if the API *sometimes* sends a final complete message
						// *after* a stream, creating a duplicate.
						// Let's refine: if the content is identical, remove the older one.
						if (last.content === secondLast.content) {
							newMessages.splice(newMessages.length - 2, 1);
							changed = true;
						}
					}
				}
				if (changed) {
					onDisplayMessagesChange?.(newMessages);
					return newMessages;
				}
				return prevDisplayMessages; // No change
			});
		},
		[chatMode],
	);

	return {
		displayMessages,
		editingMessageId,
		setEditingMessageId,
		addOptimisticUserMessage,
		updateOptimisticUserMessage,
		syncMessagesFromAPI,
	};
}
