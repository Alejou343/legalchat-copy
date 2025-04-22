import { openai } from "@ai-sdk/openai";
import { streamText, generateText, generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

// Helper function to parse steps from user input
async function parseSteps(input: string) {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        steps: z.array(z.string())
      }),
      system: `
        You are an expert at parsing instructions. 
        Extract a list of sequential steps from the user's input.
        Return them as an array of step strings.
      `,
      prompt: input,
    });
    
    return object;
}

export async function POST(req: Request) {
  try {
    // Get the workflow input from the request
    const { workflowInput } = await req.json();
    console.log("Received workflow input:", workflowInput);
    
    // Parse steps from the workflow input
    const { steps } = await parseSteps(workflowInput);
    console.log("Parsed steps:", steps);

    // Initialize state to store context
    const state = {
      steps,
      currentStep: 0,
      totalSteps: steps.length,
      context: [] as string[]
    };
    
    // Process all steps except the last one
    for (let i = 0; i < state.steps.length - 1; i++) {
      const step = state.steps[i];
      console.log(`Processing step ${i+1}/${state.totalSteps}: ${step}`);
      
      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: `
          this is the previous context of this workflow: ${state.context.join("\n")}
          this is the current step of the workflow: ${step}
          generate an answer to the user's question based on the previous context and the current step
        `,
      });
      
      state.context.push(result.text);
      console.log("Step result:", result.text);
    }

    // Process the last step with streaming
    const lastStep = state.steps[state.steps.length - 1];
    console.log(`Processing final step: ${lastStep}`);
    
    // Create a stream from the AI SDK
    const result = await streamText({
      model: openai("gpt-4o"),
      prompt: `
        this is the previous context of this workflow: ${state.context.join("\n")}
        this is the last step of the workflow: ${lastStep}
        generate an answer to the user's question based on the previous context and the last step
      `,
    });
    
    // Return the response from the AI SDK directly
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in workflow processing:", error);
    return NextResponse.json({ error: "Workflow execution failed" }, { status: 500 });
  }
} 