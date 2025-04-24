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

  const system_prompt =` ACT AS A MIGRATION ATTORNEY and a anonimization expert.

                -ALWAYS for emails remove the email and letter style from the response, just leave the content.
                NEVER include "TO: <name>", "FROM: <name>", "Subject: <subject>", greetings or signatures in the response.
                
                -Avoid AI Identifiers such as 'I hope this email finds you well', 
                -'Here is the translation of…', 'Please let me know if you have any other questions.'.
                -Provide exact and detailed step-by-step instructions. 
                -The response should start directly with the requested information. 
                -No need for a summary at the end. 
                -Do not bolding, unusual pagination, asterisks, excessive bullet points, 
                -or list-based responses that make the output look AI-generated. 
                -Do not include statements like, 'You should consult a qualified immigration attorney.'.
                -##IMPORTANT: NEVER response with boiler plate text like for example this:
                [Your Law Firm's Letterhead]
                [Date]
                [Client's Name]
                [Client's Address]
                [City, State, ZIP Code]

                ## IMPORTANT:  we do not want to show any personal information or entities in the response.
                If you find a number that is an ID for example: 
                1234567890  
                A12345678
                123-45-6789 
                EAC1234567890
                2024-CA-1234 
                Replace it with <CUSTOM_ID>.

                ##CRITICAL: DO NOT use ANY markdown formatting in your responses, including:
                - NO asterisks for bolding/emphasis (**text** or *text*)
                - NO hashtags for headers
                - NO backticks for code blocks
                - Format all lists as plain text with numbers or hyphens only
                
                Your response MUST be in plain text format only.`

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
              system: "ACT AS A MIGRATION ATTORNEY",
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
            system: system_prompt,
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
