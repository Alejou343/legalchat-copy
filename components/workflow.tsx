import { cn } from "@/lib/utils";
import { Wand2, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the expected shape of the data stream messages for workflow
export interface WorkflowData {
    workflowSteps?: string[];
    currentStep?: number; // 0-based index
    isComplete?: boolean;
  }
  
  // --- Workflow Status Component ---
  interface WorkflowStatusProps {
    steps: string[];
    currentStep: number; // 0-based index
    isComplete: boolean;
    isLoading: boolean; // Is the overall chat hook loading?
  }
  
export function WorkflowStatus({ steps, currentStep, isComplete, isLoading }: WorkflowStatusProps) {
    // Determine if the workflow itself is actively processing (before completion)
    // Show loading if the hook is loading AND the workflow isn't complete yet.
    const isWorkflowProcessing = isLoading && !isComplete;
  
    return (
      <Card className={cn(
        "w-full max-w-2xl mx-auto mt-4 border rounded-lg shadow-md",
        isComplete ? "border-green-700" : "border-yellow-200",)}>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-base font-semibold flex items-center">
            <Wand2 className="mr-2 h-5 w-5" />
            {isWorkflowProcessing ? "Workflow in Progress" : "Workflow Status"}
            {isWorkflowProcessing && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isComplete && <CheckCircle className="ml-2 h-4 w-4 text-green-700 font-bold" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm pt-0 pb-3">
          {steps.length === 0 && isLoading && (
            <p className="text-muted-foreground">Initializing workflow...</p>
          )}
          <ol className="space-y-1 list-decimal list-inside">
            {steps.map((step, index) => {
               // currentStep is 0-based, corresponds to the step *about* to run or running
               const isStepComplete = index < currentStep || (isComplete && index === steps.length -1);
               const isStepCurrent = index === currentStep && !isComplete;
  
              return (
                <li
                  key={`workflow-step-${step.replace(/\s+/g, '-')}`}
                  className={cn(
                    "transition-colors duration-300",
                    isStepComplete ? "font-medium" : "text-muted-foreground",
                    isStepCurrent ? "text-yellow-700 font-semibold animate-pulse" : "",
                  )}
                >
                  {isStepComplete && <CheckCircle className="inline h-4 w-4 mr-1 mb-0.5" />}
                  {isStepCurrent && <Loader2 className="inline h-4 w-4 mr-1 mb-0.5 animate-spin" />}
                  {!isStepComplete && !isStepCurrent && <span className="inline-block w-4 mr-1" />} {/* Placeholder for alignment */}
                  {step}
                </li>
              );
            })}
          </ol>
          {isComplete && (
            <p className="text-green-700 font-semibold mt-2">Workflow Complete!</p>
          )}
        </CardContent>
      </Card>
    );
  }