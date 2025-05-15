import { useState, useRef, useCallback, useEffect } from "react";

interface FilePreview {
    name: string;
    type: string;
    content?: string | null; // Optional if you only need name/type for preview
}

/**
 * Custom hook to manage file selection, preview, and upload status.
 * @returns An object with file state, handlers, and refs.
 */
export function useFileUpload() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    // State for the file information to be displayed in the UI (name, type)
    const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        if (file) {
            setFilePreview({ name: file.name, type: file.type });
        } else {
            setFilePreview(null);
        }
        // Clear the input value so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const handleClearSelectedFile = useCallback(() => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const triggerFileInputClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Effect for upload success animation
    useEffect(() => {
        if (uploadSuccess) {
            const timer = setTimeout(() => setUploadSuccess(false), 3000); // 3-second animation
            return () => clearTimeout(timer);
        }
    }, [uploadSuccess]);

    return {
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
    };
}
