import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function POST(req: Request) {
  const { message } = await req.json();
  console.log("message-----", message);

 
  const result = await generateText({
    model: groq('gemma2-9b-it'),
    system:`
    Act like a pseudonimization model, you will receive a message and you will need to pseudonimize it.
    this are the entities you need to pseudonimize:
    - person: names, surnames, nicknames, etc.
    - location: cities, countries, etc.
    - organization: companies, institutions, etc.
    - identity: documents, phone numbers, emails, etc.
    return the pseudonimized message in the same format of the original message, with the pseudonimized entities with the following format:
    - <person>
    - <location>
    - <organization>
    - <identity>
    for example:
    original message: "Hello, my name is John Doe and I live in New York City. My phone number is 1234567890 and my email is john.doe@example.com. I work at Google and my document is 1234567890."
    pseudonimized message: "Hello, my name is <person> and I live in <location>. My phone number is <identity> and my email is <identity>. I work at <organization> and my document is <identity>."
    for example: "give me three financial advice"
    pseudonimized message: "give me three financial advice"
    for example: "I need to do the following steps: 1. upload the image 2. upload the document 3. upload the video"
    pseudonimized message: "I need to do the following steps: 1. upload the image 2. upload the document 3. upload the video"
    IMPORTANT:
    - If there isnt any entity to pseudonimize, return the exact same message.
    - Do not answer anything else than the pseudonimized message.
    - Do not answer questions or give advice, just pseudonimize the message.
    - Do not change the message if it does not contain any entity to pseudonimize.
    `,
    prompt: message,
  });

  console.log("result pseudonimized-----", result.text);

  return Response.json({ message: result.text });
}
