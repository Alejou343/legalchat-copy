import type React from "react";
import { cn } from "@/lib/utils"; // Assuming utility
import type { LucideIcon } from "lucide-react";

interface UploadSuccessNotificationProps {
    uploadSuccess: boolean;
    icons: {
        CheckCircle2: LucideIcon;
    };
}

/**
 * Displays an animated notification when a file upload is successful.
 */
export const UploadSuccessNotification: React.FC<UploadSuccessNotificationProps> = ({
    uploadSuccess,
    icons,
}) => {
    const { CheckCircle2 } = icons;
    if (!uploadSuccess) return null;

    return (
        <div
            className={cn(
                "absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded-full shadow-lg flex items-center gap-2",
                "animate-fade-in-out" // Ensure this animation is defined in your global CSS
            )}
        >
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">
                Document processing started!
            </span>
        </div>
    );
};
