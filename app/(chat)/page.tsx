/* eslint-disable @next/next/no-img-element */
"use client";

import { useChat } from '@ai-sdk/react'
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Scale,  Wand2, Gavel, Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/components/message";
import { ThreeDotLoader } from "@/components/ThreeDotLoader";
import { Button } from "@/components/ui/button";

export default function Home() {
  // State to track current mode
  const [chatMode, setChatMode] = useState<"default" | "workflow">("default");

  // This hook will handle the API communications with modified messages
  const { messages: apiMessages, input, handleInputChange, status, append: appendToApi, setInput, setMessages } =
    useChat({
      body: {
        mode: chatMode
      },
      onError: () =>
        toast.error("You've been rate limited, please try again later!"),
    });

  // State for display messages (without "test")
  const [displayMessages, setDisplayMessages] = useState<Array<{id: string; content: string; role: 'user' | 'assistant'}>>([]);
  
  // State for editing message
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Toggle between chat modes
  const toggleChatMode = () => {
    setChatMode(currentMode => currentMode === "default" ? "workflow" : "default");
  };

  // Update display messages when API messages change (for assistant responses)
  useEffect(() => {
    // Check for new or updated assistant messages
    const lastApiMessage = apiMessages[apiMessages.length - 1];
    
    if (apiMessages.length > 0 && lastApiMessage?.role === 'assistant') {
      // Find if we already have this message in our display
      const existingMessageIndex = displayMessages.findIndex(m => m.id === lastApiMessage.id);
      
      if (existingMessageIndex >= 0) {
        // Update existing message with new content
        if (displayMessages[existingMessageIndex].content !== lastApiMessage.content) {
          const updatedMessages = [...displayMessages];
          updatedMessages[existingMessageIndex] = {
            id: lastApiMessage.id,
            content: lastApiMessage.content,
            role: 'assistant'
          };
          setDisplayMessages(updatedMessages);
        }
      } else {
        // Add new message
        setDisplayMessages(current => [
          ...current,
          {
            id: lastApiMessage.id,
            content: lastApiMessage.content,
            role: 'assistant'
          }
        ]);
      }
    }
  }, [apiMessages, displayMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  const handleCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      if (editingMessageId) {
        // Find the index of the message being edited
        const messageIndex = displayMessages.findIndex(msg => msg.id === editingMessageId);
       
        if (messageIndex !== -1) {
          // Remove all messages after the one being edited
          const updatedDisplayMessages = displayMessages.slice(0, messageIndex + 1);
          
          // Update the edited message content
          updatedDisplayMessages[messageIndex].content = input;
          
          setDisplayMessages(updatedDisplayMessages);
          
          // Clear all API messages to avoid duplicates
          setMessages([]);
        }
        
        // Pseudonymize and send the edited message to the API
        const pseudonimizedMessage = await fetch('/api/pseudonimization', {
          method: 'POST',
          body: JSON.stringify({ message: input }),
        }).then(res => res.json()).then(data => {
          console.log("data-----", data);
          return data.message;
        });
        
        // Send edited message to the API (will be the only message)
        appendToApi({
          role: 'user',
          content: `${pseudonimizedMessage}`,
        });
        
        console.log("messages-----", apiMessages);
        
        // Clear editing state and input
        setEditingMessageId(null);
        setInput('');
      } else {
        // Create a unique ID for the display message
        const messageId = Date.now().toString();
        
        // Add normal message to display messages
        setDisplayMessages(current => [
          ...current, 
          { id: messageId, content: input, role: 'user' }
        ]);
        
        const pseudonimizedMessage = await fetch('/api/pseudonimization', {
          method: 'POST',
          body: JSON.stringify({ message: input }),
        }).then(res => res.json()).then(data => {
          console.log("data-----", data);
          return data.message;
        });
        // Send message with "test" appended to the API
        appendToApi({
          role: 'user',
          content: `${pseudonimizedMessage}`,
        });
        
        // Clear input after sending
        setInput('');
      }
    }
  };

  // Function to handle editing a message
  const handleEditMessage = (id: string) => {
    const messageToEdit = displayMessages.find(msg => msg.id === id);
    if (messageToEdit && messageToEdit.role === 'user') {      
      setEditingMessageId(id);
      setInput(messageToEdit.content);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Auto-resize textarea based on content
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Handle Enter key to submit (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  return (
    <div className="flex flex-row justify-center h-[calc(100vh-56px)]">
      <div className="flex flex-col justify-between gap-4 w-full max-w-2xl">
        {displayMessages.length > 0 ? (
          <div className="flex flex-col gap-2 h-full overflow-y-auto px-4">
            {displayMessages.map((message, index) => (
              <Message 
                key={message.id} 
                message={message} 
                index={index} 
                onEdit={handleEditMessage}
              />
            ))}

            {status !== "ready" &&
              displayMessages[displayMessages.length - 1]?.role !== "assistant" && (
                <div className="flex flex-row gap-2">
                  <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
                    <Scale />
                  </div>
                  <div className="flex flex-col gap-1 text-zinc-400">
                    <div className="flex justify-center items-center gap-2">
                      <ThreeDotLoader />
                    </div>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 h-full items-center justify-center px-4">
            <Scale className="h-12 w-12" />
            <h1 className="text-xl font-medium">Welcome</h1>
            <p className="text-center text-muted-foreground">
              This is a chatbot that can help you with your legal questions.
            </p>
          </div>
        )}

        <form
          className="flex flex-col gap-2 relative items-center px-4 py-2 border-t"
          onSubmit={handleCustomSubmit}
        >
          <div className="flex items-center w-full bg-muted rounded-md px-4 py-2">
            {/* Workflow Mode Button */}
            <Button
              type="button"
              variant={chatMode === "workflow" ? "default" : "outline"}
              size="sm"
              className="mr-2 flex-shrink-0"
              onClick={toggleChatMode}
            >
              <Wand2 className="size-4" />
              Workflow
            </Button>
            
            {/* Message Input with ScrollArea */}
            <ScrollArea className="w-full max-h-[200px]">
              <textarea
                ref={textareaRef}
                className="bg-transparent flex-grow outline-none w-full resize-none overflow-hidden min-h-[24px]"
                placeholder={editingMessageId ? "Edit your message..." : "Send a message..."}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </ScrollArea>
            
            {/* Send Button */}
            <button
              type="submit"
              className="focus:outline-none ml-2 flex-shrink-0"
              aria-label="Send Message"
            >
              <span className="w-5 h-5">
                <Gavel size={20} />
              </span>
            </button>
          </div>
          {editingMessageId && (
            <div className="text-xs text-muted-foreground w-full px-2">
              Editing message... <button type="button" onClick={() => {setEditingMessageId(null); setInput("");}} className="text-primary hover:underline">Cancel</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}