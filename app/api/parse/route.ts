import { NextResponse } from "next/server";
import { ChatMessageSchema } from "@/lib/schema";
import { readMessage } from "@/lib/readMessage";
import { LlmError } from "@/lib/llm";
import { allow, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Gemma job 1: read ONE chat message. Fresh request each time, never chat history. */
export async function POST(req: Request) {
  if (!allow(`parse:${clientKey(req)}`)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON like { sender, text }." }, { status: 400 });
  }
  const parsed = ChatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Each message needs a sender and text (up to 1000 characters)." }, { status: 400 });
  }
  try {
    const out = await readMessage(parsed.data.sender, parsed.data.text);
    return NextResponse.json(out);
  } catch (e) {
    const status = e instanceof LlmError && e.status === 429 ? 429 : 502;
    const message = e instanceof Error ? e.message : "Gemma could not read this message.";
    return NextResponse.json({ error: message }, { status });
  }
}
