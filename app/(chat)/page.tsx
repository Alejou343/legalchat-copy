/* eslint-disable @next/next/no-img-element */
"use client";

import { useChat, type Message as VercelMessage } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Scale, Wand2, Gavel, Upload, X } from "lucide-react"; // Added Upload and X icons
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/components/message"; // Assuming Message component exists
import { ThreeDotLoader } from "@/components/ThreeDotLoader"; // Assuming ThreeDotLoader exists
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Use Shadcn Textarea for consistency
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { WorkflowData } from "@/components/workflow"; // Assuming WorkflowData type exists

import { cn, readFileAsDataURL } from "@/lib/utils"; // Assuming you have a utility for class names
import FileDisplay from "@/components/FileDisplay";

// --- Main Chat Component ---
export default function Home() {
	const [chatMode, setChatMode] = useState<"default" | "workflow">("default");
	const [displayMessages, setDisplayMessages] = useState<
		Array<{
			file?: { name: string; type: string; content: string | null; } | null;
			id: string;
			content: string;
			role: "user" | "assistant";
			workflow: WorkflowData | null;
		}>
	>([]);
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
	const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
	const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for selected file

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	const [file, setFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<string | null>(null);
	const [uploadSuccess, setUploadSuccess] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [resource_id, setResource_id] = useState<string | null>(null);

	  // Show upload success animation
	  useEffect(() => {
		if (uploadSuccess) {
		  const timer = setTimeout(() => setUploadSuccess(false), 3000);
		  return () => clearTimeout(timer);
		}
	  }, [uploadSuccess]);

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
			resource_id: resource_id || ''
		},
		onError: (error) => {
			console.error("Chat Error:", error);
			toast.error(error.message || "An error occurred. Please try again.");
			setSelectedFile(null); // Clear selected file on error
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
			setSelectedFile(null); // Clear selected file after successful assistant response
		},
	});

	// Derived state: Is the chat waiting for a response or streaming?
	const isLoading =
		status === "streaming" ||
		(status === "submitted" && chatMode === "workflow");

	// Auto-resize textarea
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto"; // Reset first
			// Set height, ensure minimum, prevent excessive growth
			const scrollHeight = textareaRef.current.scrollHeight;
			const minHeight = 36; // Match initial size approx
			const maxHeight = 200;
			textareaRef.current.style.height = `${Math.max(minHeight, Math.min(scrollHeight, maxHeight))}px`;
		}
	}, [input]); // Adjust height when input changes

	// Toggle between chat modes
	const toggleChatMode = () => {
		setChatMode((currentMode) => {
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

	// Handle file selection
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		setSelectedFile(file);
		// Clear the input value so the same file can be selected again
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	// Trigger hidden file input click
	const handleUploadButtonClick = () => {
		fileInputRef.current?.click();
	};

	// Clear selected file
	const handleClearFile = () => {
		setSelectedFile(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = ""; // Also clear the input value
		}
	};

	// Handle submitting the form (new messages or edits)
	const handleCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (input.trim() || selectedFile) {
			// Allow submission if there's input or a selected file
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

					// Add the file info if a file is selected
					if (selectedFile) {
						updatedDisplayMessages[messageIndex].file = {
							name: selectedFile.name,
							type: selectedFile.type,
							content: await readFileAsDataURL(selectedFile),
						};
					} else {
						// Remove file info if no file is selected
						updatedDisplayMessages[messageIndex].file = null;
					}

					setDisplayMessages(updatedDisplayMessages);

					// Clear all API messages to avoid duplicates
					// Pass an empty array to setMessages
					setMessages([] as VercelMessage[]);
				}

				// Pseudonymize and send the edited message to the API
				// const pseudonimizedMessage = await fetch("/api/pseudonimization", {
				// 	method: "POST",
				// 	body: JSON.stringify({ message: input }),
				// })
				// 	.then((res) => res.json())
				// 	.then((data) => {
				// 		return data.message;
				// 	});

				// Send edited message to the API (will be the only message)
				// Use appendToApi with potential file data in the 'data' field
				const messageData: {
					role: "user" | "assistant";
					content: string;
				} = {
					role: "user",
					content: `${input}`,
				};

				if (selectedFile) {
					const fileContent = await readFileAsDataURL(selectedFile);
					if (fileContent) {
						// Include file info and content in the data field
						const data = {
							file: {
								name: selectedFile.name,
								type: selectedFile.type,
								content: fileContent, // Sending as Data URL
							},
						};
						appendToApi(messageData, { data });
					}
				} else {
					// Send the edited message without file data
					appendToApi(messageData);
				}
				

				// Clear editing state and input
				setEditingMessageId(null);
			} else {
				// Create a unique ID for the display message
				const messageId = Date.now().toString();

				// Add normal message to display messages
				setDisplayMessages((current) => [
					...current,
					{ id: messageId, content: input || "", role: "user", workflow: null }, // Ensure content is at least empty string
				]);

				// const pseudonimizedMessage = await fetch("/api/pseudonimization", {
				// 	method: "POST",
				// 	body: JSON.stringify({ message: input }),
				// })
				// 	.then((res) => res.json())
				// 	.then((data) => {
				// 		return data.message;
				// 	});

				// Use appendToApi with potential file data in the 'data' field
				const messageData: {
					role: "user" | "assistant";
					content: string;
				} = {
					role: "user",
					content: `${input}`,
				};

				if (selectedFile) {
					const fileContent = await readFileAsDataURL(selectedFile);
					if (fileContent) {
						// Include file info and content in the data field
						const data = {
							file: {
								name: selectedFile.name,
								type: selectedFile.type,
								content: fileContent, // Sending as Data URL
							},
						};
						appendToApi(messageData, { data });
					}
				} else {
					// Send the edited message without file data
					appendToApi(messageData);
				}
			}
			setInput("");
			setSelectedFile(null); // Clear selected file after submission
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
		if (
			apiMessages.length > 0 &&
			lastApiMessage?.role === "assistant" &&
			chatMode === "workflow"
		) {
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
						workflow: data as WorkflowData, // Ensure workflow data is preserved
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
						workflow: data as WorkflowData, // Ensure workflow data is preserved
					},
				]);
			}
		} else if (
			apiMessages.length > 0 &&
			lastApiMessage?.role === "assistant" &&
			chatMode === "default"
		) {
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
		if (
			lastDisplayMessage?.role === "assistant" &&
			lastLastDisplayMessage?.role === "assistant"
		) {
			// remove the message at the displayMessages.length - 2 position
			setDisplayMessages((current) => {
				const updatedMessages = [...current];
				updatedMessages.splice(displayMessages.length - 2, 1);
				return updatedMessages;
			});
		}

		setResource_id(localStorage.getItem('currentUserId'))
	}, [displayMessages]);

	// Handle Enter key (submit) and Shift+Enter (new line)
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// Directly trigger the form submission logic
			if (!isLoading && (input.trim() || selectedFile)) {
				// Allow submission if there's input or a selected file
				// Prevent submission while loading and if input is empty and no file is selected
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

	useEffect(() => {
		const handleScroll = () => {
			if (scrollAreaRef.current) {
				const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
				const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
				setShouldAutoScroll(isAtBottom);
			}
		};

		const scrollArea = scrollAreaRef.current;
		if (scrollArea) {
			scrollArea.addEventListener("scroll", handleScroll);
			return () => scrollArea.removeEventListener("scroll", handleScroll);
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (shouldAutoScroll) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [displayMessages, isLoading, shouldAutoScroll]);

	return (
		<TooltipProvider delayDuration={100}>
			<div className="flex flex-col justify-center items-center h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] w-full">
				{" "}
				{/* Adjusted height */}
				<div className="flex flex-col justify-between w-full h-full bg-background rounded-lg shadow-xl">
					{/* Welcome Messages with Smooth Transitions */}
					{displayMessages.length === 0 && !isLoading && (
						<div className="relative h-full w-full">
							{/* Default Mode Welcome */}

							{/* Animated container for smooth fade/slide */}
							<div
								className={cn(
									"absolute inset-0 flex flex-col gap-4 items-center justify-center px-4 transition-all duration-500",
									chatMode === "default"
										? "opacity-100 translate-y-0 pointer-events-auto"
										: "opacity-0 -translate-y-4 pointer-events-none",
								)}
								aria-hidden={chatMode !== "default"}
							>
								<Scale className="h-12 w-12 transition-colors duration-300" />
								<h1 className="text-xl font-medium">Welcome</h1>
								<p className="text-center text-muted-foreground">
									AI Legal chatbot by Alcock
								</p>
								<p className="text-muted-foreground">
									Ask a question or switch to Workflow Mode for guided tasks.
								</p>
							</div>
							{/* Workflow Mode Welcome */}
							<div
								className={cn(
									"absolute inset-0 flex flex-col gap-4 items-center justify-center px-4 text-center transition-all duration-500",
									chatMode === "workflow"
										? "opacity-100 translate-y-0 pointer-events-auto"
										: "opacity-0 translate-y-4 pointer-events-none",
								)}
								aria-hidden={chatMode !== "workflow"}
							>
								<Wand2 className="h-12 w-12 text-muted-foreground transition-colors duration-300" />
								<h1 className="text-xl font-medium">Workflow Mode</h1>
								<p className="text-muted-foreground">
									Describe the legal task you need assistance with. The AI will
									guide you through the steps.
								</p>
							</div>
						</div>
					)}

					{/* Message Display Area */}
					<ScrollArea
						ref={scrollAreaRef}
						className="flex-grow p-4 overflow-y-auto"
					>
						<div className="max-w-4xl mx-auto flex flex-col gap-4">
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
						</div>

						<div ref={messagesEndRef} />
					</ScrollArea>
					{/* Display selected file preview with clear button */}
					<div className="w-full max-w-4xl mx-auto flex flex-col gap-4 relative">
						{selectedFile && (
							<FileDisplay 
								selectedFile={selectedFile}
								handleClearFile={handleClearFile}
							/>
						)}
					</div>

					{/* Input Area */}
					<form
						className="flex flex-col gap-2 relative items-center mx-auto w-full max-w-4xl py-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
						onSubmit={handleCustomSubmit}
					>
						<div className="flex items-center w-full gap-2">
							{/* Hidden file input */}
							<input
								type="file"
								ref={fileInputRef}
								className="hidden"
								onChange={handleFileChange}
							/>
							{/* Upload File Button */}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="transition-colors"
										onClick={handleUploadButtonClick}
										disabled={isLoading || editingMessageId !== null} // Disable while loading or editing
										aria-label="Upload File"
									>
										<Upload className="size-5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top">Upload File</TooltipContent>
							</Tooltip>

							{/* Workflow Mode Toggle */}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant={chatMode === "workflow" ? "default" : "ghost"}
										size="icon"
										className={cn(
											"transition-colors",
											chatMode === "workflow" &&
												"bg-primary text-primary-foreground",
										)}
										onClick={toggleChatMode}
										disabled={isLoading || editingMessageId !== null} // Disable while loading or editing
										aria-label="Toggle Workflow Mode"
									>
										<Wand2 className="size-5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top">
									{chatMode === "workflow"
										? "Workflow mode enabled"
										: "Switch to workflow mode"}
								</TooltipContent>
							</Tooltip>

							{/* Message Input */}
							<div className="flex-grow relative">
								<Textarea
									ref={textareaRef}
									className={cn(
										"w-full min-h-[40px] max-h-[200px] resize-none pr-10 text-base bg-muted/60 rounded-lg border-none shadow-inner focus:ring-2 focus:ring-primary/30 transition",
										editingMessageId && "ring-2 ring-primary/40",
										selectedFile && "ring-2 ring-blue-500/40", // Indicate file is selected
									)}
									placeholder={
										editingMessageId
											? "Edit your message..."
											: selectedFile
												? `Adding file: ${selectedFile.name}` // Indicate selected file
												: chatMode === "workflow"
													? "Describe your legal task..."
													: "Type your message..."
									}
									value={input}
									onChange={handleTextareaChange}
									onKeyDown={handleKeyDown}
									rows={1}
									disabled={isLoading}
									autoFocus
								/>
								{/* Send Button (floating inside input) */}
								<button
									type="submit"
									className={cn(
										"absolute bottom-2 right-2 p-1 rounded-full bg-primary text-primary-foreground shadow transition-opacity",
										(isLoading || (!input.trim() && !selectedFile)) && // Disable if loading and no input/file
											"opacity-50 pointer-events-none",
									)}
									aria-label="Send Message"
									disabled={isLoading || (!input.trim() && !selectedFile)} // Disable if loading and no input/file
								>
									<Gavel size={18} />
								</button>
							</div>
						</div>
						{editingMessageId && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground w-full px-1">
								<span>Editing message...</span>
								<Button
									type="button"
									variant="link"
									size="sm"
									className="px-0 h-auto text-primary"
									onClick={() => {
										setEditingMessageId(null);
										setInput("");
										setSelectedFile(null); // Clear file selection when canceling edit
									}}
								>
									Cancel
								</Button>
							</div>
						)}
					</form>
				</div>
			</div>
		</TooltipProvider>
	);
}