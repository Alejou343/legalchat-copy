import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function POST(req: Request) {
  const { message } = await req.json();
  console.log("message-----", message);

 
  const result = await generateText({
    model: groq('gemma2-9b-it'),
    system:`
    Act like a ANONYMIZATION model, you will receive a message and you will need to anonymize it.

    CRITICAL:
    - Do not answer any question
    -DO not give any advice
    -DO not give any information
    -DO not give any explanation
    -DO not give any recommendation
    -DO not give any conclusion
    -DO not write any letter

    this are the entities you need to anonymize:
    - person: just names, surnames, nicknames, etc.
    - location: just names of cities.
    - organization: just names of companies and institutions.
    - identity: just phone numbers and emails.

    return the anonymized message in the same format of the original message, with the anonymized entities with the following format:
    - <person>
    - <location>
    - <organization>
    - <identity>
    for example if the message is:
    EXAMPLE 1:
    original message: "Hello, my name is John Doe and I live in New York City. My phone number is 1234567890 and my email is john.doe@example.com. I work at Google and my document is 1234567890."
    pseudonimized message: "Hello, my name is <person> and I live in <location>. My phone number is <identity> and my email is <identity>. I work at <organization> and my document is <identity>."
    EXAMPLE 2:
    original message: "give me three financial advice"
    anonymized message: "give me three financial advice"
    EXAMPLE 3:
    if there is not any entity to anonymize, return the exact same message like the following example:
    original message: "1. upload the image 2. upload the document 3. upload the video"
    anonymized message: "1. upload the image 2. upload the document 3. upload the video"
    EXAMPLE 4:
    original message: "Write a letter for the BCPNP"
    anonymized message: "Write a letter for the BCPNP"
    EXAMPLE 5:
    original message: "how to migrate to Canada?"
    anonymized message: "how to migrate to Canada?"
    `,
    prompt: message,
  });

  console.log("result pseudonimized-----", result.text);

  return Response.json({ message: result.text });
}
