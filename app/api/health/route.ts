import { NextResponse } from "next/server";
import { checkProvider } from "@/lib/llm";
import { storeKind } from "@/lib/crowdmind/store";

export const runtime = "nodejs";

/** Tells you if Gemma is reachable before you paste a long chat. */
export async function GET() {
  const status = await checkProvider();
  return NextResponse.json({ ...status, store: storeKind() }, { status: status.ok ? 200 : 503 });
}
