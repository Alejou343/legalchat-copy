import type React from "react";
import { Button } from "@/components/ui/button"; // Assuming Shadcn UI
import type { LucideIcon } from "lucide-react";

interface FileUploadPreviewUIProps {
    fileName: string;
    onClearFile: () => void;
    icons: {
        FileText: LucideIcon;
        X: LucideIcon;
    };
}

/**
 * Displays a preview of the selected file with a clear button.
 * This is a UI component, distinct from the FileDisplay component mentioned in original imports.
 */
export const FileUploadPreviewUI: React.FC<FileUploadPreviewUIProps> = ({
    fileName,
    onClearFile,
    icons,
}) => {
    const { FileText, X } = icons;
    return (
        <div className="mb-2 flex gap-2 items-center mx-auto w-full max-w-4xl p-2 rounded-md border border-border text-base bg-muted/80 shadow-sm transition">
            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm truncate flex-1 text-muted-foreground">
                {fileName}
            </span>
            <Button
                variant="ghost"
                size="icon" // Use "icon" for a small square button
                onClick={onClearFile}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Clear selected file"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
};
