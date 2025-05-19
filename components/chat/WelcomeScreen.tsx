import type React from "react";
import { cn } from "@/lib/utils"; // Assuming utility
import type { LucideIcon } from "lucide-react"; // For icon prop types

interface WelcomeScreenProps {
    chatMode: "default" | "workflow";
    icons: {
        Scale: LucideIcon;
        Wand2: LucideIcon;
    };
}

/**
 * Displays the welcome message based on the current chat mode.
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ chatMode, icons }) => {
    const { Scale, Wand2 } = icons;
    return (
        <div className="relative h-full w-full">
            {/* Default Mode Welcome */}
            <div
                className={cn(
                    "absolute inset-0 flex flex-col gap-4 items-center justify-center px-4 transition-all duration-500",
                    chatMode === "default"
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 -translate-y-4 pointer-events-none",
                )}
                aria-hidden={chatMode !== "default"}
            >
                <Scale className="h-12 w-12 text-muted-foreground transition-colors duration-300" />
                <h1 className="text-xl font-medium">Welcome</h1>
                <p className="text-center text-muted-foreground">
                    AI Legal chatbot by Alcock
                </p>
                <p className="text-muted-foreground">
                    Ask a question or switch to Workflow Mode for guided tasks.
                </p>
            </div>

            {/* Workflow Mode Welcome */}
            <div
                className={cn(
                    "absolute inset-0 flex flex-col gap-4 items-center justify-center px-4 text-center transition-all duration-500",
                    chatMode === "workflow"
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 translate-y-4 pointer-events-none",
                )}
                aria-hidden={chatMode !== "workflow"}
            >
                <Wand2 className="h-12 w-12 text-muted-foreground transition-colors duration-300" />
                <h1 className="text-xl font-medium">Workflow Mode</h1>
                <p className="text-muted-foreground">
                    Describe the legal task you need assistance with. The AI will
                    guide you through the steps.
                </p>
            </div>
        </div>
    );
};
