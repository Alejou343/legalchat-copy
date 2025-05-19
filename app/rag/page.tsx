/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Wand2,
  Gavel,
  Upload,
  X,
  Trash2,
  Loader2,
  Scale,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/components/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRAG } from "@/hooks/useRAG";
import type { WorkflowData } from "@/components/workflow";

export default function CombinedChat() {
  const {
    file,
    setFile,
    isUploading,
    uploadedFile,
    uploadSuccess,
    fileInputRef,
    messagesEndRef,
    messages,
    input,
    handleInputChange,
    isLoading,
    error,
    handleFileChange,
    handleSubmit,
    handleDelete,
    chatMode,
    toggleChatMode,
  } = useRAG();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 36;
      const maxHeight = 200;
      textareaRef.current.style.height = `${Math.max(
        minHeight,
        Math.min(scrollHeight, maxHeight)
      )}px`;
    }
  }, [input]);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col justify-center items-center h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] w-full">
        <div className="flex flex-col justify-between w-full h-full bg-background rounded-lg shadow-xl">
          {/* Welcome Messages */}
          {messages.length === 0 && !isLoading && (
            <div className="relative h-full w-full flex flex-col gap-4 items-center justify-center px-4">
              {chatMode === "rag" ? (
                <>
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <h1 className="text-xl font-medium">Document Analysis</h1>
                  <p className="text-center text-muted-foreground">
                    Upload a document and ask questions about its content
                  </p>
                </>
              ) : chatMode === "workflow" ? (
                <>
                  <Wand2 className="h-12 w-12 text-muted-foreground" />
                  <h1 className="text-xl font-medium">Workflow Mode</h1>
                  <p className="text-muted-foreground">
                    Describe the legal task you need assistance with.
                  </p>
                </>
              ) : (
                <>
                  <Scale className="h-12 w-12" />
                  <h1 className="text-xl font-medium">Welcome</h1>
                  <p className="text-center text-muted-foreground">
                    AI Legal chatbot by Alcock
                  </p>
                </>
              )}
            </div>
          )}

          {/* Message Display Area */}
          <ScrollArea className="flex-grow p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
              {messages.map((message, index) => (
                <Message
                  key={index}
                  message={{
                    id: index.toString(),
                    content: message.content,
                    workflow: null,
                    role: message.role as "user" | "assistant",
                  }}
                  index={index}
                />
              ))}

              {isLoading && (
                <div className="flex flex-row gap-2 items-start mt-4">
                  <div className="size-[24px] flex justify-center items-center flex-shrink-0 text-zinc-500 mt-1">
                    {chatMode === "rag" ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <Scale className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-zinc-500 bg-muted rounded-md px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* File upload status (solo para modo RAG) */}
          {chatMode === "rag" && (
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 relative">
              {file && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-200 mx-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-800">{file.name}</span>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="p-1 rounded-full hover:bg-blue-100 text-blue-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {uploadedFile && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200 mx-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-800">
                      {uploadedFile}
                    </span>
                    {uploadSuccess && (
                      <span className="text-xs text-green-600 animate-pulse">
                        Uploaded successfully!
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleDelete}
                    className="p-1 rounded-full hover:bg-green-100 text-green-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input Area */}
          <form
            className="flex flex-col gap-2 relative items-center mx-auto w-full max-w-4xl py-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center w-full gap-2">
              {/* Mode toggle buttons */}
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={chatMode === "workflow" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => toggleChatMode("workflow")}
                      disabled={isLoading || isUploading}
                    >
                      <Wand2 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Workflow Mode</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={chatMode === "rag" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => toggleChatMode("rag")}
                      disabled={isUploading}
                    >
                      <FileText className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Document Analysis</TooltipContent>
                </Tooltip>
              </div>

              {/* File upload for RAG mode */}
              {chatMode === "rag" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={file ? "default" : "ghost"}
                      size="icon"
                      className={file ? "bg-blue-500 text-white" : ""}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upload PDF</TooltipContent>
                </Tooltip>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf"
              />

              {/* Message Input */}
              <div className="flex-grow relative">
                <Textarea
                  ref={textareaRef}
                  className={cn(
                    "w-full min-h-[40px] max-h-[200px] resize-none pr-10 text-base bg-muted/60 rounded-lg border-none shadow-inner focus:ring-2 focus:ring-primary/30 transition",
                    file && "ring-2 ring-blue-500/40"
                  )}
                  placeholder={
                    chatMode === "rag"
                      ? file
                        ? `Ask about ${file.name}...`
                        : uploadedFile
                        ? `Ask about ${uploadedFile}...`
                        : "Upload a PDF first..."
                      : chatMode === "workflow"
                      ? "Describe your legal task..."
                      : "Type your message..."
                  }
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isLoading && (input.trim() || file)) {
                        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                      }
                    }
                  }}
                  rows={1}
                  disabled={
                    isLoading ||
                    isUploading ||
                    (chatMode === "rag" && !uploadedFile && !file)
                  }
                  autoFocus
                />

                {/* Submit Button */}
                <button
                  type="submit"
                  className={cn(
                    "absolute bottom-2 right-2 p-1 rounded-full bg-primary text-primary-foreground shadow transition-opacity",
                    (isLoading || isUploading || (!input.trim() && !file)) &&
                      "opacity-50 pointer-events-none"
                  )}
                  disabled={
                    isLoading || isUploading || (!input.trim() && !file)
                  }
                >
                  {chatMode === "rag" ? (
                    <FileText size={18} />
                  ) : (
                    <Gavel size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 px-2">
                {error.message || "An error occurred. Please try again."}
              </div>
            )}
          </form>
        </div>
      </div>
    </TooltipProvider>
  );
}
