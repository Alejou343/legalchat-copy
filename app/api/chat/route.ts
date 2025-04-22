import { openai } from "@ai-sdk/openai";
import { streamText, generateText,generateObject } from "ai";
import { z } from "zod";

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
  const { messages, mode } = await req.json();
  console.log("messages-----", messages);
  console.log("mode-----", mode);
  if (mode === "default") {
    const result = streamText({
      model: openai("gpt-4o"),
      system:
        "do not respond on markdown or lists, keep your responses brief, you can ask the user to upload images or documents if it could help you understand the problem better",
      messages,
    });

    return result.toDataStreamResponse();

  } else if (mode === "workflow") {
    const { steps } = await parseSteps(messages[messages.length - 1].content);
    console.log("Parsed steps:", steps);

    const state = {
      steps,
      currentStep: 0,
      totalSteps: steps.length,
      context: [] as string[]
    };
    
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

    const lastStep = state.steps[state.steps.length - 1];
    console.log(`Processing final step: ${lastStep}`);
    
    const result = await streamText({
      model: openai("gpt-4o"),
      prompt: `
        this is the previous context of this workflow: ${state.context.join("\n")}
        this is the last step of the workflow: ${lastStep}
        generate an answer to the user's question based on the previous context and the last step
      `,
    });
    
    return result.toDataStreamResponse();
  } else {
    // Default case for any other mode values
    return Response.json({ error: "Invalid mode specified" }, { status: 400 });
  }
}
