import { NextResponse } from "next/server";
import { getMockReply, type ChatMessage } from "@/lib/mockReplies";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const useLLM = process.env.USE_LLM === "true";

  // Simulated thinking delay (400-900ms) for all paths to keep UX consistent.
  const delay = 400 + Math.floor(Math.random() * 500);
  await new Promise((r) => setTimeout(r, delay));

  if (!useLLM) {
    const reply = getMockReply(messages);
    return NextResponse.json({ reply });
  }

  // ============================================================
  // TODO: Enable a real LLM here.
  // To switch to a real model:
  //   1. Set env var USE_LLM=true in Vercel project settings.
  //   2. Provide a provider API key, e.g. OPENAI_API_KEY.
  //   3. Uncomment and adapt the block below.
  //
  // Example with OpenAI (requires: npm install openai):
  //
  //   import OpenAI from "openai";
  //   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //   const completion = await openai.chat.completions.create({
  //     model: "gpt-4o-mini",
  //     messages: [
  //       { role: "system", content: "You are Sway, an AI agent..." },
  //       ...messages,
  //     ],
  //   });
  //   const reply = completion.choices[0]?.message?.content ?? "...";
  //   return NextResponse.json({ reply });
  // ============================================================

  // Fallback while LLM path is not implemented.
  const reply = getMockReply(messages);
  return NextResponse.json({ reply });
}
