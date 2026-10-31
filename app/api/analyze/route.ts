import { NextResponse } from "next/server";
import { AnalyzeBody } from "@/lib/analyze/schema";
import { analyzeChat } from "@/lib/analyze/analyzeChat";
import { LlmError } from "@/lib/llm";
import { allow, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Gemma job 3: read the whole chat and explain it. */
export async function POST(req: Request) {
  if (!allow(`analyze:${clientKey(req)}`, 20)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }
  const parsed = AnalyzeBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Send JSON like { text }." }, { status: 400 });
  try {
    return NextResponse.json({ analysis: await analyzeChat(parsed.data.text) });
  } catch (e) {
    const status = e instanceof LlmError && e.status === 429 ? 429 : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gemma could not analyze this chat." }, { status });
  }
}
