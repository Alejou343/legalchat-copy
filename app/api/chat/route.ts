import { openai } from "@ai-sdk/openai";
import { streamText, generateText, generateObject, createDataStreamResponse, DataStreamWriter } from "ai";
import { z } from "zod";

const MODEL_VERSION = "gpt-4o";

async function parseSteps(input: string) {
  const { object } = await generateObject({
    model: openai(MODEL_VERSION),
    schema: z.object({
      steps: z.array(z.string())
    }),
    system: `
      You are an expert at parsing instructions. 
      Extract a list of sequential steps from the user's input.
      Return them as an array of step strings.
      for example:
      input: "I need to do the following steps: 1. upload the image 2. upload the document 3. upload the video"
      output: ["upload the image", "upload the document", "upload the video"]
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
      model: openai(MODEL_VERSION),
      system:
        "do not respond on markdown or lists, keep your responses brief, you can ask the user to upload images or documents if it could help you understand the problem better",
      messages,
    });

    return result.toDataStreamResponse();

  } else if (mode === "workflow") {
    return createDataStreamResponse({
      async execute(dataStream: DataStreamWriter) {
        try {
          const { steps } = await parseSteps(messages[messages.length - 1].content);
          console.log("Parsed steps:", steps);

          const state = {
            steps,
            currentStep: 0,
            totalSteps: steps.length,
            context: [] as string[]
          };

          dataStream.writeData({ workflowSteps: steps, currentStep: 0, isComplete: false });
          
          for (let i = 0; i < state.steps.length - 1; i++) {
            const step = state.steps[i];
            state.currentStep = i;
            console.log(`Processing step ${i+1}/${state.totalSteps}: ${step}`);
            
            dataStream.writeData({ workflowSteps: steps, currentStep: i, isComplete: false });
            
            const result = await generateText({
              model: openai(MODEL_VERSION),
              prompt: `
                PREVIOUS_CONTEXT: ${state.context.join("\n") || 'None'}
                CURRENT_STEP: ${step}
                Generate a concise internal thought or summary based ONLY on the CURRENT_STEP and PREVIOUS_CONTEXT.
                if there is no PREVIOUS_CONTEXT, just return the answer for the current step.
              `,
            });
            
            state.context.push(result.text);
            console.log("Step result:", result.text);
          }

          const lastStep = state.steps[state.steps.length - 1];
          state.currentStep = state.steps.length - 1;
          console.log(`Processing final step: ${lastStep}`);
          
          dataStream.writeData({ workflowSteps: steps, currentStep: state.currentStep, isComplete: false });

          const finalResult = streamText({
            model: openai(MODEL_VERSION),
            prompt: `
              PREVIOUS_CONTEXT: ${state.context.join("\n") || 'None'}
              FINAL_STEP: ${steps[steps.length - 1]}
              Generate the final answer for the user based on the PREVIOUS_CONTEXT and the FINAL_STEP.
            `,
            onFinish: () => {
              dataStream.writeData({ workflowSteps: steps, currentStep: state.currentStep, isComplete: true });
              console.log("Final text stream finished, marked data complete.");
            }
          });

          await finalResult.mergeIntoDataStream(dataStream);

        } catch (error) {
          console.error("Error during workflow processing or final stream:", error);
          try { dataStream.writeData({ error: "Workflow processing failed" }); } catch {};
        } finally {
          console.log("Data stream lifecycle managed by createDataStreamResponse.");
        }
      },
    });

  } else {
    return Response.json({ error: "Invalid mode specified" }, { status: 400 });
  }
}
