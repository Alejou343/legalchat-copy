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
    Extract a list of sequential steps from the user's input, even when steps aren't explicitly numbered.
    Maintain the user's original wording but standardize format.
    Break complex steps into simpler ones when appropriate.
    Ignore conversational elements and focus only on actionable items.

    Examples:
    Example 1:
    Input: "I need to do the following steps: 1. upload the image 2. upload the document 3. upload the video"
    Output: ["upload the image", "upload the document", "upload the video"]

    Example 2: 
    Input: "First I want to fill out the I-485 form, then submit it with my supporting documents, and finally schedule a biometrics appointment"
    Output: ["fill out the I-485 form", "submit form with supporting documents", "schedule a biometrics appointment"]

    Example 3:
    Input: "Can you help me understand what I need to do for asylum? I arrived last month."
    Output: ["understand asylum requirements", "determine eligibility based on arrival date"]
    `,
    prompt: input,
  });
  
  return object;
}

export async function POST(req: Request) {
  const { messages, mode } = await req.json();
  console.log("messages-----", messages);
  console.log("mode-----", mode);

  const system_prompt = `ACT AS A MIGRATION ATTORNEY that answers questions and redacts emails, letters and documents.
          
      STYLE RULES:
      1.DO NOT use any placeholder formats such as [Client's Name],[Your Law Firm's Letterhead],[Date],<Date>, or [Your Name]. These are strictly forbidden.
      2.DO NOT INVENT NAMES OR EMAILS. Only use names, contact information, or any other identifying details if explicitly provided in the input context. If not provided, use generic but professional phrasing like:

      -"Dear Client,"
      -"Best regards,
      -Immigration Attorney"

      3.The tone must be professional, empathetic, and legally informative.
      4.DO NOT need for a summary at the end. 
      5. Do NOT include statements like, 'You should consult a qualified immigration attorney.'.
      6. DO NOT use any placeholder format using [word(s)] or <word(s)>.

`
  if (mode === "default") {
    const result = streamText({
      model: openai(MODEL_VERSION),
      system: system_prompt,
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
              system: system_prompt,
              // system: "ACT AS A MIGRATION ATTORNEY. based on the context and the current step answer the question.",
              prompt: `
                PREVIOUS_CONTEXT: ${state.context.join("\n") || 'None'}
                CURRENT_STEP: ${step}
              `,
            });
            
            state.context.push(result.text);
            console.log("Step result:::::", result.text);
          }

          const lastStep = state.steps[state.steps.length - 1];
          state.currentStep = state.steps.length - 1;
          console.log(`Processing final step: ${lastStep}`);
          
          dataStream.writeData({ workflowSteps: steps, currentStep: state.currentStep, isComplete: false });

          const finalResult = streamText({
            model: openai(MODEL_VERSION),
            system: system_prompt,
            temperature:0,
            prompt: `
              PREVIOUS_CONTEXT: ${state.context.join("\n") || 'None'}
              CURRENT_STEP: ${lastStep}
              Generate the final answer for the user based on the PREVIOUS_CONTEXT and the CURRENT_STEP.
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
