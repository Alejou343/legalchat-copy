import type React from 'react';
import { FileText, X, FileImage, FileAudio, FileVideo, FileArchive, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileDisplayProps {
    selectedFile: File | null;
    handleClearFile: () => void;
}

const FileDisplay: React.FC<FileDisplayProps> = ({ selectedFile, handleClearFile }) => {
    if (!selectedFile) return null;

    const fileType = selectedFile.type.split('/')[0];
    const fileExtension = (selectedFile.name.split('.').pop() || '').toLowerCase();

    const renderIcon = () => {
        if (fileType === 'image') return <FileImage size={48} />;
        if (fileType === 'video') return <FileVideo size={48} />;
        if (fileType === 'audio') return <FileAudio size={48} />;
        if (fileType === 'application' && fileExtension === 'pdf') return <FileText size={48} />;
        if (fileType === 'application' || ['zip', 'rar', '7z'].includes(fileExtension)) return <FileArchive size={48} />;
        return <FileQuestion size={48} />;
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 relative">
            {/* File Icon and Info */}
            <div className="w-full flex flex-col items-center justify-center min-h-[200px] bg-muted/30 rounded-lg p-4">
                {renderIcon()}
                <span className="mt-2 text-sm text-muted-foreground text-center">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
            </div>

            {/* Clear Button */}
            <div className="absolute top-2 right-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={handleClearFile}
                    aria-label="Clear selected file"
                >
                    <X size={14} />
                </Button>
            </div>
        </div>
    );
};

export default FileDisplay;
