"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Send,
  Bot,
  Loader2,
  FileText,
  Paperclip,
  X,
  CheckCircle2,
} from "lucide-react";

export default function Chat() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    error,
  } = useChat(
    resourceId
      ? {
          api: "/api/ragchat",
          body: { resourceId },
        }
      : undefined
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show upload success animation
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        alert("Please upload a PDF file");
      }
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/ragchat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload PDF");

      const data = await response.json();
      localStorage.setItem("currentUserId", data.resourceId);
      setUploadedFile(file.name);
      setUploadSuccess(true);

      await append({
        content: `I've uploaded ${file.name}`,
        role: "user",
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading file");
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  useEffect(() => {
    const id = localStorage.getItem("currentUserId");
    setResourceId(id);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (file) {
      await handleFileUpload();
    }

    if (input.trim()) {
      try {
        await handleSubmit(e);

        // Verificar si el último mensaje tiene contenido después de 3 segundos
        setTimeout(() => {
          const lastMessage = messages[messages.length - 1];
          if (
            lastMessage &&
            !lastMessage.content &&
            !lastMessage.toolInvocations
          ) {
            append({
              content:
                "I'm having trouble generating a response. Please try again.",
              role: "assistant",
            });
          }
        }, 3000);
      } catch (err) {
        console.error("Error submitting message:", err);
      }
    }
  };

  const renderToolInvocation = (invocation: any) => {
    if (!invocation) return null;

    if (invocation.toolName === "addResource") {
      return (
        <div className="flex items-center gap-1 text-blue-500">
          <FileText className="h-3 w-3 animate-pulse" />
          <span>Adding resource to knowledge base...</span>
        </div>
      );
    }

    if (invocation.toolName === "getInformation") {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Searching for information...</span>
          </div>
          {invocation.args?.question && (
            <div className="text-xs mt-1">
              Query: {invocation.args.question}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Processing your request...</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-3xl h-[85vh] flex flex-col shadow-lg border-gray-200">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">AI Assistant</h1>
          </div>
          {uploadedFile && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="max-w-[150px] truncate">{uploadedFile}</span>
            </Badge>
          )}
        </div>

        {/* Chat Area */}
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center text-gray-500">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-lg font-medium mb-2">
                  How can I help you today?
                </h2>
                <p className="text-sm max-w-md">
                  Ask me anything or upload a document for analysis. I can
                  answer general questions or help you understand document
                  content.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 w-full",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role !== "user" && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 max-w-[80%] shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-gray-100 text-gray-800 rounded-tl-none"
                    )}
                  >
                    {message.content ? (
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    ) : message.toolInvocations?.[0] ? (
                      <div className="text-sm italic text-gray-500">
                        {renderToolInvocation(message.toolInvocations[0])}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm italic text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Thinking...
                      </div>
                    )}
                    {error &&
                      message.id === messages[messages.length - 1]?.id && (
                        <div className="text-xs text-red-500 mt-1">
                          Error: {error.message}
                        </div>
                      )}
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        You
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* File Upload Preview */}
        {file && (
          <div className="mx-4 mb-2 flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-100">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="text-sm truncate flex-1 text-blue-700">
              {file.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Upload Success Animation */}
        {uploadSuccess && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded-full shadow-md flex items-center gap-2 animate-fade-in-out">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">
              Document uploaded successfully!
            </span>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4 rounded-b-lg">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="h-10 w-10 rounded-full flex-shrink-0"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Upload PDF Document</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="relative flex-grow">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder={
                  uploadedFile
                    ? "Ask about the document or any other question..."
                    : "Type a message..."
                }
                className="pr-12 py-6 rounded-full pl-4 border-gray-300 focus-visible:ring-primary"
                disabled={isLoading || isUploading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && !file) || isLoading || isUploading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
              >
                {isLoading || isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
