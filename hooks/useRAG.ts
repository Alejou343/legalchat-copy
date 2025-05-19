import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { WorkflowData } from "@/components/workflow";

export const useRAG = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [resource_id, setResource_id] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"default" | "workflow" | "rag">(
    "default"
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    error,
  } = useChat({
    api: "/api/ragchat", // Mismo endpoint para todos los modos
    body: {
      chatMode, // Enviamos el modo actual
      resource_id, // Solo relevante para modo RAG
    },
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

  const toggleChatMode = (mode: "default" | "workflow" | "rag") => {
    setChatMode((prevMode) => (prevMode === mode ? "default" : mode));
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatMode", "rag"); // Especificamos que es un upload para RAG

    try {
      const response = await fetch("/api/chat", {
        // Mismo endpoint
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

    if (chatMode === "rag" && file) {
      await handleFileUpload();
    }

    if (input.trim()) {
      try {
        await handleSubmit(e);
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

      if (data.message) {
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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
    uploadedFile,
    uploadSuccess,
    fileInputRef,
    messagesEndRef,
    resource_id,
    messages,
    input,
    handleInputChange,
    handleSubmit: handleFormSubmit,
    isLoading,
    error,
    handleFileChange,
    handleFileUpload,
    handleDelete,
    chatMode,
    toggleChatMode,
  };
};
