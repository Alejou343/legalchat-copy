// app/api/recipe/route.ts

import { bedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const model = bedrock('us.anthropic.claude-3-7-sonnet-20250219-v1:0', {
      additionalModelRequestFields: { top_k: 350 },
    });

    const prompt =
      body.prompt || "Write a vegetarian lasagna recipe for 4 people.";

    const { text } = await generateText({
      model,
      prompt,
    });

    return NextResponse.json({ success: true, result: text });
  } catch (error) {
    console.error("Error generating recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate recipe" },
      { status: 500 }
    );
  }
}