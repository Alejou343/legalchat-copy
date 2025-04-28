/* eslint-disable @next/next/no-img-element */
"use client";

import { useChat, type Message as VercelMessage } from '@ai-sdk/react';
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Scale, Wand2, Gavel, CheckCircle, Loader2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // Assuming you have a utility for class names

// Define the expected shape of the data stream messages for workflow
interface WorkflowData {
  workflowSteps?: string[];
  currentStep?: number; // 0-based index
  isComplete?: boolean;
}

// --- Workflow Status Component ---
interface WorkflowStatusProps {
  steps: string[];
  currentStep: number; // 0-based index
  isComplete: boolean;
  isLoading: boolean; // Is the overall chat hook loading?
}

function WorkflowStatus({ steps, currentStep, isComplete, isLoading }: WorkflowStatusProps) {
  // Determine if the workflow itself is actively processing (before completion)
  // Show loading if the hook is loading AND the workflow isn't complete yet.
  const isWorkflowProcessing = isLoading && !isComplete;

  return (
    <Card className={cn(
      "w-full max-w-2xl mx-auto mt-4",
      isComplete ? "border-green-200" : "border-yellow-200",)}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-base font-semibold flex items-center">
          <Wand2 className="mr-2 h-5 w-5" />
          {isWorkflowProcessing ? "Workflow in Progress" : "Workflow Status"}
          {isWorkflowProcessing && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          {isComplete && <CheckCircle className="ml-2 h-4 w-4 text-green-700 font-bold" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm pt-0 pb-3">
        {steps.length === 0 && isLoading && (
          <p className="text-muted-foreground">Initializing workflow...</p>
        )}
        <ol className="space-y-1 list-decimal list-inside">
          {steps.map((step, index) => {
             // currentStep is 0-based, corresponds to the step *about* to run or running
             const isStepComplete = index < currentStep || (isComplete && index === steps.length -1);
             const isStepCurrent = index === currentStep && !isComplete;

            return (
              <li
                key={`workflow-step-${step.replace(/\s+/g, '-')}`}
                className={cn(
                  "transition-colors duration-300",
                  isStepComplete ? "font-medium" : "text-muted-foreground",
                  isStepCurrent ? "text-yellow-700 font-semibold animate-pulse" : "",
                )}
              >
                {isStepComplete && <CheckCircle className="inline h-4 w-4 mr-1 mb-0.5" />}
                {isStepCurrent && <Loader2 className="inline h-4 w-4 mr-1 mb-0.5 animate-spin" />}
                {!isStepComplete && !isStepCurrent && <span className="inline-block w-4 mr-1" />} {/* Placeholder for alignment */}
                {step}
              </li>
            );
          })}
        </ol>
        {isComplete && (
          <p className="text-green-700 font-semibold mt-2">Workflow Complete!</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Chat Component ---
export default function Home() {
  const [chatMode, setChatMode] = useState<"default" | "workflow">("default");
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0); // Start at 0
  const [workflowComplete, setWorkflowComplete] = useState<boolean>(false);
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
    append,
  } = useChat({
    api: '/api/chat', // Ensure your API endpoint is correct
    body: {
      mode: chatMode, // Send mode to the backend
    },
    onError: (error) => {
      console.error("Chat Error:", error);
      toast.error(error.message || "An error occurred. Please try again.");
    },
    onFinish: (message) => {
      // remove markdown bold formatting
      if (message.role === 'assistant') {
        const cleanedMessage = message.content.replace(/(\*\*|__)(.*?)\1/g, '$2');
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
  });

  // Derived state: Is the chat waiting for a response or streaming?
  const isLoading = status === 'streaming' || status === 'submitted';

  // Process workflow data stream
  useEffect(() => {
    if (chatMode === 'workflow' && data && data.length > 0) {
      // Process the most recent data message reliably
      const lastData = data[data.length - 1] as WorkflowData; // Assume last item is latest update

      if (Array.isArray(lastData.workflowSteps)) {
         setWorkflowSteps(lastData.workflowSteps);
      }
      // Ensure currentStep is a valid number before updating
      if (typeof lastData.currentStep === 'number' && lastData.currentStep >= 0) {
         // Add check to prevent going beyond bounds if steps change
         setWorkflowSteps(prevSteps => {
            if (lastData.currentStep !== undefined && lastData.currentStep < prevSteps.length) {
               setCurrentStep(lastData.currentStep);
            } else if (lastData.currentStep !== undefined && prevSteps.length === 0) {
               // Allow setting step 0 even if steps haven't arrived yet
               setCurrentStep(lastData.currentStep);
            }
            return prevSteps; // Return previous steps, state setter batching handles this
         });
      }
      if (typeof lastData.isComplete === 'boolean') {
         setWorkflowComplete(lastData.isComplete);
      }
    }
  }, [data, chatMode]); // Rerun when data stream or mode changes

  // Reset workflow state when switching TO default mode OR when starting a new submission in workflow mode
   useEffect(() => {
    if (chatMode === 'default') {
      setWorkflowSteps([]);
      setCurrentStep(0);
      setWorkflowComplete(false);
    }
  }, [chatMode]);

  // Scroll to bottom when new messages are added or loading status changes
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]); // Trigger scroll on new messages or loading change

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset first
      // Set height, ensure minimum, prevent excessive growth
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 36; // Match initial size approx
      const maxHeight = 200;
      textareaRef.current.style.height = `${Math.max(minHeight, Math.min(scrollHeight, maxHeight))}px`;
    }
  }, []); // Adjust height when input changes

  // Toggle chat mode
  const toggleChatMode = () => {
    setChatMode(currentMode => currentMode === "default" ? "workflow" : "default");
    // Workflow state reset is handled by the useEffect watching `chatMode`
    setInput(''); // Clear input when switching modes
    setEditingMessageId(null); // Cancel editing when switching modes
  };

  // Auto-resize textarea based on content
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    if (textareaRef.current) {
      if (e.target.value === '') {
        // Reset to default height when empty
        textareaRef.current.style.height = '24px';
      } else {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    }
  };

  // Handle submitting the form (new messages or edits)
  const handleCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentInput = input.trim();
    if (!currentInput) return;

    // Reset workflow state specifically when submitting in workflow mode
    if (chatMode === 'workflow') {
        setWorkflowSteps([]);
        setCurrentStep(0);
        setWorkflowComplete(false);
    }

    // --- Pseudonymization (Example) ---
    // Consider doing this server-side or abstracting it
    let messageToSend = currentInput;
    try {
        const response = await fetch('/api/pseudonimization', { // Ensure this API exists
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: currentInput }),
        });
        if (!response.ok) throw new Error('Pseudonymization failed');
        const data = await response.json();
        messageToSend = data.message; // Use pseudonymized message
        console.log("Pseudonymized:", messageToSend);
    } catch (error) {
        console.error("Pseudonymization Error:", error);
        toast.error("Failed to process message securely. Please try again.");
        return; // Stop submission if pseudonymization fails
    }
    // --- End Pseudonymization ---

    if (editingMessageId) {
      const messageIndex = apiMessages.findIndex(msg => msg.id === editingMessageId);

      if (messageIndex !== -1 && apiMessages[messageIndex].role === 'user') {
        // 1. Create the history *up to the message before the edit*
        const historyBeforeEdit = apiMessages.slice(0, messageIndex);

        // 2. Create the edited user message object
        const editedUserMessage: VercelMessage = {
          ...apiMessages[messageIndex], // Keep original ID, role
          content: messageToSend, // Use the new (pseudonymized) content
          // Ensure createdAt is updated if necessary, though useChat might handle this
        };

        // 3. Set the hook's messages to the history including the edited message
        setMessages([...historyBeforeEdit, editedUserMessage]);

        // 4. Trigger the AI to regenerate the response based on the new history.
        //    `reload()` is often for retrying the *last* AI response.
        //    For editing an earlier user message, we might need to explicitly
        //    call our backend API with the new history, OR if `useChat` supports it,
        //    triggering a resubmit from the hook itself after setMessages.
        //    Let's try calling `reload()` - check `@ai-sdk/react` docs if this works as intended
        //    for this scenario. If not, we might need a custom fetch here or adjust the strategy.
        //    A common pattern if `reload` doesn't fit is to clear subsequent messages and `append` again.
        //    Let's stick to the `reload()` idea first, assuming it recalculates based on current `messages`.
        // reload(); // This might only retry the *last* assistant message.

        // Alternative: Let's use the original handleSubmit provided by useChat.
        // After setting the messages, calling handleSubmit *might* internally use
        // the updated message list. Test this behavior.
        // We need to pass the *options* including the potentially updated message list.
        // This seems complex.

        // Safest approach with `append`: Set the history correctly, then `append` the *next*
        // message (which is the edited one, now at the end of our `setMessages` call).
        // This feels redundant though.

        // Let's reconsider the initial approach: Update history with `setMessages`,
        // then call the *original* submit handler, hoping it uses the latest state.
        // The hook's `handleSubmit` likely just calls `append` internally with the current `input`.
        // This won't work directly.

        // **Revised Strategy for Edit:**
        // 1. Find index `messageIndex`.
        // 2. Slice `apiMessages` up to `messageIndex`.
        // 3. Create the *new* user message object with `messageToSend`.
        // 4. Update the history using `setMessages([...apiMessages.slice(0, messageIndex), newUserMessage])`.
        // 5. **Manually trigger the backend call.** `useChat` is primarily for appending.
        //    We might need a separate function/hook for "submitting history".
        //    OR - the simplest way to integrate with `useChat`:
        //    a. Set the messages state: `setMessages([...apiMessages.slice(0, messageIndex)])` (history *before* edit)
        //    b. Clear the input: `setInput('')`
        //    c. Append the *edited* message: `append({ role: 'user', content: messageToSend })`

        setMessages(apiMessages.slice(0, messageIndex)); // History *before* the edited message
        setInput(''); // Clear the input field visually
        append({ role: 'user', content: messageToSend }); // Append the edited message as if it were new

      } else {
        console.warn("Couldn't find message to edit or message is not from user.");
      }

      setEditingMessageId(null); // Exit editing mode
      // Input is cleared by setInput or append

    } else {
      // Standard new message submission using the hook's append
      append({
        role: 'user',
        content: messageToSend,
      });
      setInput(''); // Clear input after sending
    }

    // Ensure textarea height resets after submit if needed (though append clears input)
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  };


  // Function to initiate editing a message
  const handleEditMessage = (id: string) => {
    const messageToEdit = apiMessages.find(msg => msg.id === id);
    // Allow editing only user messages and only if not currently loading
    if (messageToEdit && messageToEdit.role === 'user' && !isLoading) {
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
       toast.info("Please wait for the current response to finish before editing.");
    }
  };

  // Handle Enter key (submit) and Shift+Enter (new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Directly trigger the form submission logic
      if (!isLoading && input.trim()) { // Prevent submission while loading or if input is empty
         const form = e.currentTarget.form;
         if(form) {
            // Create a synthetic submit event if needed or call handler directly
             handleCustomSubmit(new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent<HTMLFormElement>);
         }
      }
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col justify-center items-center h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] w-full"> {/* Adjusted height */}
        <div className="flex flex-col justify-between w-full max-w-4xl h-full bg-background rounded-lg shadow-xl border">

          {/* Message Display Area */}
          <ScrollArea className="flex-grow p-4 overflow-y-auto">
            {apiMessages.length === 0 && !isLoading && chatMode === 'default' && (
              <div className="flex flex-col gap-4 h-full items-center justify-center text-center">
                <Scale className="h-12 w-12 text-muted-foreground" />
                <h1 className="text-xl font-medium">Welcome to AI Legal Chat</h1>
                <p className="text-muted-foreground">
                  Ask a question or switch to Workflow Mode for guided tasks.
                </p>
              </div>
            )}
             {apiMessages.length === 0 && !isLoading && chatMode === 'workflow' && (
              <div className="flex flex-col gap-4 h-full items-center justify-center text-center">
                <Wand2 className="h-12 w-12 text-muted-foreground" />
                <h1 className="text-xl font-medium">Workflow Mode</h1>
                <p className="text-muted-foreground">
                  Describe the legal task you need assistance with. The AI will guide you through the steps.
                </p>
              </div>
            )}

            {/* Render Messages */}
            {apiMessages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                index={index}
                onEdit={handleEditMessage}
                // Remove workflow prop here, it's handled separately below
                // workflow={null}
              />
            ))}

            {/* Loading indicator for assistant response in default mode */}
            {isLoading && apiMessages[apiMessages.length - 1]?.role === 'user' && chatMode === 'default' && (
               <div className="flex flex-row gap-2 items-start mt-4">
                 <div className="size-[24px] flex justify-center items-center flex-shrink-0 text-zinc-500 mt-1">
                   <Scale />
                 </div>
                 <div className="flex flex-col gap-1 text-zinc-500 bg-muted rounded-md px-3 py-2">
                     <ThreeDotLoader />
                 </div>
               </div>
            )}

            {/* Separate Workflow Status Display */}
             {chatMode === 'workflow' && (workflowSteps.length > 0 || (isLoading && apiMessages[apiMessages.length - 1]?.role === 'user')) && (
               <WorkflowStatus
                 steps={workflowSteps}
                 currentStep={currentStep}
                 isComplete={workflowComplete}
                 isLoading={isLoading} // Pass overall loading status
               />
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
                  onClick={() => { setEditingMessageId(null); setInput(""); }}
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
                    variant={chatMode === "workflow" ? "secondary" : "outline"} // Use secondary for active
                    size="icon" // Make it square
                    className={cn(
                        "flex-shrink-0 transition-colors",
                        chatMode === "workflow" ? "border-primary text-primary" : ""
                    )}
                    onClick={toggleChatMode}
                    aria-label={chatMode === "workflow" ? "Switch to Default Mode" : "Switch to Workflow Mode"}
                    >
                    <Wand2 className="size-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{chatMode === "workflow" ? "Switch to Default Chat" : "Switch to Workflow Mode"}</p>
                </TooltipContent>
                </Tooltip>

              {/* Message Input */}
              <Textarea
                ref={textareaRef}
                className="flex-grow resize-none overflow-y-auto min-h-[40px] max-h-[200px] text-sm px-3 py-2" // Adjusted padding/min-height
                placeholder={editingMessageId ? "Edit your message..." : "Send a message..."}
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