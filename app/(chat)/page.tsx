/* eslint-disable @next/next/no-img-element */
"use client";

import { useChat, type Message as VercelMessage } from "@ai-sdk/react";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Scale, Wand2, Gavel } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/components/message"; // Assuming Message component exists
import { ThreeDotLoader } from "@/components/ThreeDotLoader"; // Assuming ThreeDotLoader exists
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Use Shadcn Textarea for consistency
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import type { WorkflowData } from "@/components/workflow"; // Assuming WorkflowData type exists

import { cn } from "@/lib/utils"; // Assuming you have a utility for class names

// --- Main Chat Component ---
export default function Home() {
	const [chatMode, setChatMode] = useState<"default" | "workflow">("default");
	const [displayMessages, setDisplayMessages] = useState<
		Array<{
			id: string;
			content: string;
			role: "user" | "assistant";
			workflow: WorkflowData | null;
		}>
	>([]);
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const {
		messages: apiMessages, // Source of truth from the API/hook
		input,
		handleInputChange,
		setInput,
		setMessages,
		data,
		status, // 'idle', 'loading', 'streaming', 'submitted' - Use 'loading' for general check
		append: appendToApi,
	} = useChat({
		api: "/api/chat", // Ensure your API endpoint is correct
		body: {
			mode: chatMode, // Send mode to the backend
		},
		onError: (error) => {
			console.error("Chat Error:", error);
			toast.error(error.message || "An error occurred. Please try again.");
		},
		onFinish: (message) => {
			// remove markdown bold formatting
			if (message.role === "assistant") {
				const cleanedMessage = message.content.replace(
					/(\*\*|__)(.*?)\1/g,
					"$2",
				);
				if (cleanedMessage !== message.content) {
					setMessages((prevMessages) => {
						const updatedMessages = [...prevMessages];
						updatedMessages[updatedMessages.length - 1] = {
							...message,
							content: cleanedMessage,
						};
						return updatedMessages;
					});
				}
			}
		},
	});

	// Derived state: Is the chat waiting for a response or streaming?
	const isLoading = status === 'streaming' || (status === 'submitted' && chatMode === 'workflow');

	// // Scroll to bottom when new messages are added or loading status changes
	// const scrollToBottom = useCallback(() => {
	// 	messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	// }, []);

	// useEffect(() => {
	// 	scrollToBottom();
	// }, [scrollToBottom]); // Trigger scroll on new messages or loading change

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto"; // Reset first
			// Set height, ensure minimum, prevent excessive growth
			const scrollHeight = textareaRef.current.scrollHeight;
			const minHeight = 36; // Match initial size approx
			const maxHeight = 200;
			textareaRef.current.style.height = `${Math.max(minHeight, Math.min(scrollHeight, maxHeight))}px`;
		}
	}, []); // Adjust height when input changes

	  // Toggle between chat modes
    const toggleChatMode = () => {
      setChatMode(currentMode => {
        const newMode = currentMode === "default" ? "workflow" : "default";
        return newMode;
      });
    };

	// Auto-resize textarea based on content
	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		handleInputChange(e);
		if (textareaRef.current) {
			if (e.target.value === "") {
				// Reset to default height when empty
				textareaRef.current.style.height = "24px";
			} else {
				textareaRef.current.style.height = "auto";
				textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
			}
		}
	};

	// Handle submitting the form (new messages or edits)
	const handleCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (input.trim()) {
			if (editingMessageId) {
				// Find the index of the message being edited
				const messageIndex = displayMessages.findIndex(
					(msg) => msg.id === editingMessageId,
				);

				if (messageIndex !== -1) {
					// Remove all messages after the one being edited
					const updatedDisplayMessages = displayMessages.slice(
						0,
						messageIndex + 1,
					);

					// Update the edited message content
					updatedDisplayMessages[messageIndex].content = input;

					setDisplayMessages(updatedDisplayMessages);

					// Clear all API messages to avoid duplicates
					// Pass an empty array to setMessages
					setMessages([] as VercelMessage[]);
				}

				// Pseudonymize and send the edited message to the API
				const pseudonimizedMessage = await fetch("/api/pseudonimization", {
					method: "POST",
					body: JSON.stringify({ message: input }),
				})
					.then((res) => res.json())
					.then((data) => {
						console.log("data-----", data);
						return data.message;
					});

				// Send edited message to the API (will be the only message)
				appendToApi({
					role: "user",
					content: `${pseudonimizedMessage}`,
				});

				console.log("messages-----", apiMessages);

				// Clear editing state and input
				setEditingMessageId(null);
			} else {
				// Create a unique ID for the display message
				const messageId = Date.now().toString();

				// Add normal message to display messages
				setDisplayMessages((current) => [
					...current,
					{ id: messageId, content: input, role: "user", workflow: null },
				]);

				const pseudonimizedMessage = await fetch("/api/pseudonimization", {
					method: "POST",
					body: JSON.stringify({ message: input }),
				})
					.then((res) => res.json())
					.then((data) => {
						return data.message;
					});
				// Send message to the API
				appendToApi({
					role: "user",
					content: `${pseudonimizedMessage}`,
				});
			}
			setInput("");
		}
	};

	// Function to initiate editing a message
	const handleEditMessage = (id: string) => {
		const messageToEdit = apiMessages.find((msg) => msg.id === id);
		// Allow editing only user messages and only if not currently loading
		if (messageToEdit && messageToEdit.role === "user" && !isLoading) {
			// We need the *original* non-pseudonymized content to edit.
			// This is a problem with the current flow. Pseudonymization should ideally happen
			// *just before* sending to the API, not modifying the source state.
			// For now, we'll edit the potentially pseudonymized content from `apiMessages`.
			// A better approach requires storing original user input separately or reversing pseudonymization (if possible).
			setInput(messageToEdit.content); // Load potentially pseudonymized content into input
			setEditingMessageId(id);
			textareaRef.current?.focus();
			textareaRef.current?.select(); // Select text for easy replacement
		} else if (isLoading) {
			toast.info(
				"Please wait for the current response to finish before editing.",
			);
		}
	};

	// Update display messages when API messages change
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
		useEffect(() => {
		const lastApiMessage = apiMessages[apiMessages.length - 1];
		if (apiMessages.length > 0 && lastApiMessage?.role === "assistant" && chatMode === "workflow") {
			const existingMessageIndex = displayMessages.findIndex(
				(m) => m.id === lastApiMessage.id,
			);

			if (existingMessageIndex >= 0) {
				// Update existing message with new content
				if (
					displayMessages[existingMessageIndex].content !==
					lastApiMessage.content
				) {
					const updatedMessages = [...displayMessages];
					updatedMessages[existingMessageIndex] = {
						id: lastApiMessage.id,
						content: lastApiMessage.content,
						role: "assistant",
						workflow: (data as WorkflowData), // Ensure workflow data is preserved
					};
					setDisplayMessages(updatedMessages);
				} else if (data) {
          // Update workflow data if it exists
          const updatedMessages = [...displayMessages];
          updatedMessages[existingMessageIndex].workflow = data as WorkflowData;
          setDisplayMessages(updatedMessages);
        }
			} else {
				// Add new message
				setDisplayMessages((current) => [
					...current,
					{
						id: lastApiMessage.id,
						content: lastApiMessage.content,
						role: "assistant",
						workflow: (data as WorkflowData), // Ensure workflow data is preserved
					},
				]);
			}
		} else if (apiMessages.length > 0 && lastApiMessage?.role === "assistant" && chatMode === "default") {
      // Add new message
      setDisplayMessages((current) => [
        ...current,
        {
          id: lastApiMessage.id,
          content: lastApiMessage.content,
          role: "assistant",
          workflow: null, // No workflow data in default mode
        },
      ]);
    }
		// Only depend on apiMessages for display updates
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [apiMessages, data]);

  useEffect(() => {
	const lastDisplayMessage = displayMessages[displayMessages.length - 1];
  const lastLastDisplayMessage = displayMessages[displayMessages.length - 2];
  if (lastDisplayMessage?.role === "assistant" && lastLastDisplayMessage?.role === "assistant") {
    // remove the message at the displayMessages.length - 2 position
    setDisplayMessages((current) => {
      const updatedMessages = [...current];
      updatedMessages.splice(displayMessages.length - 2, 1);
      return updatedMessages;
    });
  }

  }, [displayMessages]);

	// Handle Enter key (submit) and Shift+Enter (new line)
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// Directly trigger the form submission logic
			if (!isLoading && input.trim()) {
				// Prevent submission while loading or if input is empty
				const form = e.currentTarget.form;
				if (form) {
					// Create a synthetic submit event if needed or call handler directly
					handleCustomSubmit(
						new Event("submit", {
							bubbles: true,
							cancelable: true,
						}) as unknown as React.FormEvent<HTMLFormElement>,
					);
				}
			}
		}
	};

	return (
		<TooltipProvider delayDuration={100}>
			<div className="flex flex-col justify-center items-center h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] w-full">
				{" "}
				{/* Adjusted height */}
				<div className="flex flex-col justify-between w-full max-w-4xl h-full bg-background rounded-lg shadow-xl border">
					{/* Welcome Messages */}
					{displayMessages.length === 0 &&
							!isLoading && (<div className="flex flex-col gap-4 h-full items-center justify-center px-4">
						{chatMode === "default" && (
								<div className="flex flex-col gap-4 h-full items-center justify-center text-center">
									<Scale className="h-12 w-12" />
									<h1 className="text-xl font-medium">Welcome</h1>
									<p className="text-center text-muted-foreground">
										AI Legal chatbot by Alcock
									</p>
									<p className="text-muted-foreground">
										Ask a question or switch to Workflow Mode for guided tasks.
									</p>
								</div>
							)}
						{chatMode === "workflow" && (
								<div className="flex flex-col gap-4 h-full items-center justify-center text-center">
									<Wand2 className="h-12 w-12 text-muted-foreground" />
									<h1 className="text-xl font-medium">Workflow Mode</h1>
									<p className="text-muted-foreground">
										Describe the legal task you need assistance with. The AI
										will guide you through the steps.
									</p>
								</div>
							)}
					</div>)}

          {/* Message Display Area */}
					<ScrollArea className="flex-grow p-4 overflow-y-auto">
						{/* Render Messages */}
						{displayMessages.map(
							(message, index) =>
								message && (
									<Message
										key={message.id}
										message={message}
										index={index}
										onEdit={handleEditMessage}
									/>
								),
						)}

						{/* Loading indicator for assistant response in default mode */}
						{isLoading &&
							displayMessages[displayMessages.length - 1]?.role === "user" &&
							chatMode === "default" && (
								<div className="flex flex-row gap-2 items-start mt-4">
									<div className="size-[24px] flex justify-center items-center flex-shrink-0 text-zinc-500 mt-1">
										<Scale />
									</div>
									<div className="flex flex-col gap-1 text-zinc-500 bg-muted rounded-md px-3 py-2">
										<ThreeDotLoader />
									</div>
								</div>
							)}

						<div ref={messagesEndRef} />
					</ScrollArea>

					{/* Input Area */}
					<form
						className="flex flex-col gap-2 p-4 border-t bg-background"
						onSubmit={handleCustomSubmit}
					>
						{editingMessageId && (
							<div className="text-xs text-muted-foreground px-1 flex justify-between items-center">
								<span>Editing message...</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-auto px-2 py-0.5 text-xs"
									onClick={() => {
										setEditingMessageId(null);
										setInput("");
									}}
								>
									Cancel Edit
								</Button>
							</div>
						)}
						<div className="flex items-end gap-2 relative">
							{/* Workflow Mode Button */}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant={chatMode === "workflow" ? "default" : "outline"}
										className={cn("flex-shrink-0 transition-colors")}
										onClick={toggleChatMode}
										aria-label={
											chatMode === "workflow"
												? "Switch to Default Mode"
												: "Switch to Workflow Mode"
										}
                    disabled={isLoading} // Disable while loading
									>
										<Wand2 className="size-5" />
										Workflow
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>
										{chatMode === "workflow"
											? "Switch to Default Chat"
											: "Switch to Workflow Mode"}
									</p>
								</TooltipContent>
							</Tooltip>

							{/* Message Input */}
							<Textarea
								ref={textareaRef}
								className="flex-grow resize-none overflow-y-auto min-h-[40px] max-h-[200px] text-sm px-3 py-2" // Adjusted padding/min-height
								placeholder={
									editingMessageId
										? "Edit your message..."
										: "Send a message..."
								}
								value={input}
								onChange={handleTextareaChange} // Use the hook's handler directly
								onKeyDown={handleKeyDown}
								rows={1} // Start with 1 row, auto-resizing will handle growth
								disabled={isLoading && !editingMessageId} // Disable input when loading, unless editing
							/>

							{/* Send Button */}
							<Tooltip>
								<TooltipTrigger asChild>
									{/* Wrap button in span for tooltip when disabled */}
									<span>
										<Button
											type="submit"
											size="icon" // Make it square
											className="flex-shrink-0"
											aria-label="Send Message"
											disabled={isLoading || !input.trim()} // Disable while loading or if input is empty
										>
											<Gavel className="size-5" />
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent>
									<p>Send Message</p>
								</TooltipContent>
							</Tooltip>
						</div>
					</form>
				</div>
			</div>
		</TooltipProvider>
	);
}