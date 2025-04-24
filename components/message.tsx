import { Scale, Copy, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Markdown } from "@/components/markdown";
import { useState } from "react";
import { toast } from "sonner";
import { WorkflowTimeline } from "./workflow-timeline";

interface MessageProps {
  message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
  };
  index: number;
  onEdit?: (id: string) => void;
  workflow?: {
    steps: string[];
    currentStep: number;
    isComplete: boolean;
  } | null;
}

export const Message = ({ message, index, onEdit, workflow }: MessageProps) => {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Message copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy message");
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.id);
    }
  };
  
  return (
    <motion.div
      key={message.id}
      className={`relative flex flex-row gap-2 w-full ${index === 0 ? "pt-4" : ""} ${isUser ? "justify-end" : "justify-start"} group`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isUser && (
        <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
          <Scale />
        </div>
      )}

      <div className="flex flex-col gap-1 relative max-w-full overflow-hidden">
        {!isUser && workflow && (
          <WorkflowTimeline 
            steps={workflow.steps}
            currentStep={workflow.currentStep}
            isComplete={workflow.isComplete}
          />
        )}
        <div className="flex flex-col gap-4 max-w-full overflow-hidden">
          <Markdown>{message.content}</Markdown>
        </div>
        
        {showActions && (
          <div className={`absolute ${isUser ? "top-0 left-0 -translate-x-full -ml-2" : "-top-8 right-0"} bg-zinc-800 rounded-md shadow-md p-1 flex gap-2 z-[9999]`}>
            {!isUser && (
              <button 
                onClick={copyToClipboard}
                className="p-1 hover:bg-zinc-700 rounded-md transition-colors"
                title="Copy message"
              >
                <Copy size={16} />
              </button>
            )}
            {isUser && (
              <button 
                onClick={handleEdit}
                className="p-1 hover:bg-zinc-700 rounded-md transition-colors"
                title="Edit message"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}; 