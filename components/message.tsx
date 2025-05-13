import { Scale, Copy, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Markdown } from "@/components/markdown";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkflowTimeline } from "./workflow-timeline";
import type { WorkflowData } from "./workflow";

interface MessageProps {
	message: {id: string; content: string; role: 'user' | 'assistant', workflow?: WorkflowData | null};
	index: number;
	onEdit?: (id: string) => void;
}

export const Message = ({ message, index, onEdit }: MessageProps) => {
	const isUser = message.role === "user";
	const [showActions, setShowActions] = useState(false);
	  // State for workflow steps - initialize with defaults
	  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
	  const [currentStep, setCurrentStep] = useState(0);
	  const [workflowComplete, setWorkflowComplete] = useState(false);

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

	useEffect(() => {
		if (message.workflow) {
			const data = message.workflow as unknown as WorkflowData[];
			const lastData = data[data.length - 1] as WorkflowData;
			if(lastData){
			if (lastData.workflowSteps) {
				setWorkflowSteps(lastData.workflowSteps);
			  }
			  if (typeof lastData.currentStep === 'number') {
				setCurrentStep(lastData.currentStep);
			  }
			  if (typeof lastData.isComplete === 'boolean') {
				setWorkflowComplete(lastData.isComplete);
			  }
			}
		}
	}, [message.workflow]);

	return (
		<motion.div
			key={message.id}
			className={`relative flex flex-row gap-2 w-full ${index === 0 ? "pt-4" : "pt-6"} ${isUser ? "justify-end" : "justify-start"} group transition-colors`}
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
				{!isUser && message.workflow && (
					<WorkflowTimeline
						steps={workflowSteps}
						currentStep={currentStep}
						isComplete={workflowComplete}
					/>
				)}
				<div className="flex flex-col gap-4 max-w-full overflow-hidden">
					<Markdown>{message.content}</Markdown>
				</div>

				{showActions && (
					<div
						className={`absolute ${isUser ? "top-0 left-0 -translate-x-full -ml-2" : "top-0 right-0"} bg-zinc-800 rounded-md shadow-md p-1 flex gap-2 z-[1000]`}
					>
						{!isUser && (
							<button
								type="button"
								onClick={copyToClipboard}
								className="p-1 hover:bg-zinc-700 rounded-md transition-colors"
								title="Copy message"
							>
								<Copy size={16} className="text-zinc-400" />
							</button>
						)}
						{isUser && (
							<button
								type="button"
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