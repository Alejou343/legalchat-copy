import { Scale, Copy, Pencil, FileArchive, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Markdown } from "@/components/markdown";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkflowTimeline } from "./workflow-timeline";
import type { WorkflowData } from "./workflow";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageProps {
	message: {
		id: string;
		content: string;
		role: "user" | "assistant";
		workflow: WorkflowData | null;
		file?: { name: string; type: string; content: string | null } | null;
	};
	index: number;
	onEdit?: (id: string) => void;
}

export const Message = ({ message, index, onEdit }: MessageProps) => {
	const isUser = message.role === "user";
	const [showActions, setShowActions] = useState(false);
	const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
	const [currentStep, setCurrentStep] = useState(0);
	const [workflowComplete, setWorkflowComplete] = useState(false);
	// console.log("Message: ", message);

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
			if (lastData) {
				if (lastData.workflowSteps) {
					setWorkflowSteps(lastData.workflowSteps);
				}
				if (typeof lastData.currentStep === "number") {
					setCurrentStep(lastData.currentStep);
				}
				if (typeof lastData.isComplete === "boolean") {
					setWorkflowComplete(lastData.isComplete);
				}
			}
		}
	}, [message.workflow]);

	return (
		<motion.div
			key={message.id}
			className={`relative flex flex-row gap-4 w-full ${index === 0 ? "pt-4" : ""} ${
				isUser ? "justify-end" : "justify-start"
			} group transition-all`}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
			animate={{ opacity: 1 }}
			initial={{ opacity: 0 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			{isUser && (
				<div className="flex flex-row gap-2 p-2 items-center">
					{/* TODO: ad editing functionality */}
					{/* <motion.div
						animate={{ opacity: showActions ? 1 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="w-8 h-8 flex flex-shrink-0 rounded-lg items-center justify-center hover:bg-accent cursor-pointer">
									<Pencil size={15} />
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="mt-2">
								Edit
							</TooltipContent>
						</Tooltip>
					</motion.div> */}
					<div className="flex flex-col gap-2 relative max-w-full overflow-hidden rounded-lg bg-accent p-4">
						<div className="flex flex-col gap-4 max-w-full overflow-hidden">
							<Markdown>{message.content}</Markdown>
						</div>
						{message.file && (
							<div className="flex flex-row gap-2 items-center bg-stone-900/10 dark:bg-zinc-600 p-2 rounded-lg max-w-fit">
								<div className="w-8 h-8 flex flex-shrink-0 rounded-lg items-center">
									{message.file.type === "application/pdf" && (
										<FileText size={25} />
									)}
								</div>
								<div className="flex flex-col relative max-w-full overflow-hidden rounded-lg pr-2">
									<div className="text-sm font-medium">{message.file.name}</div>
								</div>
							</div>
							)}
					</div>
				</div>
			)}
			{!isUser && (
				<div className="flex flex-col gap-2 p-4">
					<div className="w-8 h-8 flex flex-shrink-0 rounded-lg items-center justify-center mx-2">
						<Scale size={25} />
					</div>
					<div className="flex flex-col gap-2 relative max-w-full overflow-hidden rounded-lg px-1">
						{message.workflow && (
							<div className="mb-2">
								<WorkflowTimeline
									steps={workflowSteps}
									currentStep={currentStep}
									isComplete={workflowComplete}
								/>
							</div>
						)}
						<div className="flex flex-col gap-4 max-w-full overflow-hidden">
							<Markdown>{message.content}</Markdown>
						</div>
					</div>
					<motion.div
						animate={{ opacity: showActions ? 1 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<div
									className="w-8 h-8 flex flex-shrink-0 rounded-lg items-center justify-center hover:bg-accent cursor-pointer"
									onClick={copyToClipboard}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											copyToClipboard();
										}
									}}
								>
									<Copy size={15} />
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="mt-2">
								Copy
							</TooltipContent>
						</Tooltip>
					</motion.div>
				</div>
			)}
		</motion.div>
	);
};