import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";

export const useRAG = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [resource_id, setResource_id] = useState<string | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    error,
  } = useChat({
    api: "/api/ragchat",
    body: { resource_id },
  });

  // Cargar datos persistentes al iniciar
  useEffect(() => {
    const storedFile = localStorage.getItem("uploaded_file");
    const storedResourceId = localStorage.getItem("currentUserId");

    if (storedFile) {
      setUploadedFile(storedFile);
    }
    if (storedResourceId) {
      setResource_id(storedResourceId);
    }
  }, []);

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
      localStorage.setItem("currentUserId", data.resource_id);
      localStorage.setItem("uploaded_file", file.name);
      setUploadedFile(file.name);
      setResource_id(data.resource_id);
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

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (file) {
      await handleFileUpload();
    }

    if (input.trim()) {
      try {
        await handleSubmit(e);

        setTimeout(() => {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && !lastMessage.content && !lastMessage.parts) {
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

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/embeddings/${resource_id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.message === "embeddings deleted") {
        localStorage.removeItem("currentUserId");
        localStorage.removeItem("uploaded_file");
        setResource_id(null);
        setUploadedFile(null);
      }
    } catch (error) {
      console.error("Error deleting embedding:", error);
    }
  };

  // Limpiar todo al cerrar la ventana
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem("currentUserId");
      localStorage.removeItem("uploaded_file");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Animación de éxito en upload
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  return {
    file,
    setFile,
    isUploading,
    setIsUploading,
    uploadedFile,
    setUploadedFile,
    uploadSuccess,
    setUploadSuccess,
    fileInputRef,
    messagesEndRef,
    resource_id,
    setResource_id,
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    error,
    handleFileChange,
    handleFileUpload,
    handleFormSubmit,
    handleDelete,
  };
};
