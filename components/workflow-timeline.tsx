import React from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface WorkflowTimelineProps {
  steps: string[];
  currentStep: number;
  isComplete: boolean;
}

export function WorkflowTimeline({ steps, currentStep, isComplete }: WorkflowTimelineProps) {
  return (
    <div className="w-full px-4 py-3 mb-4 bg-muted/50 rounded-lg">
      <div className="text-sm font-medium mb-2">Workflow Progress</div>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep || isComplete;
          
          return (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div 
                  className={`text-sm font-medium w-full pr-2 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  style={{ 
                    wordWrap: 'break-word', 
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word'
                  }}
                >
                  {step}
                </div>
                {index < steps.length - 1 && (
                  <div className="ml-2.5 mt-1 mb-1 w-px h-3 bg-border" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 