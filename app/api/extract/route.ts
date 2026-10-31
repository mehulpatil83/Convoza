import { NextResponse } from "next/server";
import { ExtractBody } from "@/lib/analyze/schema";
import { extractFromChat } from "@/lib/analyze/analyzeChat";
import { LlmError } from "@/lib/llm";
import { allow, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Gemma job 4: build one kind of structure (timeline, calendar, checklist...) from the chat. */
export async function POST(req: Request) {
  if (!allow(`extract:${clientKey(req)}`, 30)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }
  const parsed = ExtractBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send JSON like { kind, text }." }, { status: 400 });
  try {
    return NextResponse.json({ result: await extractFromChat(parsed.data.kind, parsed.data.text) });
  } catch (e) {
    const status = e instanceof LlmError && e.status === 429 ? 429 : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gemma could not read this chat." }, { status });
  }
}
