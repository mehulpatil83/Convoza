import { callJson } from "../llmJson";
import { parseChat } from "../parseChat";
import { todayIst } from "../calendar";
import { prefilter } from "../crowdmind/checkPost";
import { ANALYZE_SYSTEM, EXTRACT_SYSTEM, analyzeUser, extractUser } from "./prompt";
import { AnalysisSchema, ANALYSIS_JSON_SCHEMA, EXTRACT_JSON_SCHEMAS, EXTRACT_SCHEMAS, type ChatAnalysis, type ExtractKind, type ExtractResult } from "./schema";
import { guardAnalysis, guardAnnouncements, guardCalendar, guardChecklist, guardDelivery, guardExpenses, guardTimeline } from "./guard";

/** Code-level scam check over every message, run before and apart from the model. */
export function scanAlerts(text: string): string[] {
  const out = new Set<string>();
  for (const m of parseChat(text)) {
    const p = prefilter(m.text);
    if (p.blocked) out.add(`${m.sender}: ${p.reason}`);
    if (out.size >= 5) break;
  }
  return [...out];
}

/** Gemma job 3: understand the whole chat, then let code check it. */
export async function analyzeChat(text: string, call: typeof callJson = callJson, now: Date = new Date()): Promise<ChatAnalysis> {
  const raw = await call(AnalysisSchema, { system: ANALYZE_SYSTEM, user: analyzeUser(text, todayIst(now)), jsonSchema: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown> });
  return guardAnalysis(raw, text, parseChat(text), scanAlerts(text));
}

/** Gemma job 4: pull one kind of structure out of the chat, then guard it. */
export async function extractFromChat(kind: ExtractKind, text: string, call: typeof callJson = callJson, now: Date = new Date()): Promise<ExtractResult> {
  const req = { system: EXTRACT_SYSTEM[kind], user: extractUser(text, todayIst(now)), jsonSchema: EXTRACT_JSON_SCHEMAS[kind] };
  switch (kind) {
    case "timeline": return guardTimeline(await call(EXTRACT_SCHEMAS.timeline, req), text);
    case "calendar": return guardCalendar(await call(EXTRACT_SCHEMAS.calendar, req), text);
    case "checklist": return guardChecklist(await call(EXTRACT_SCHEMAS.checklist, req), text);
    case "expenses": return guardExpenses(await call(EXTRACT_SCHEMAS.expenses, req), text);
    case "announcements": return guardAnnouncements(await call(EXTRACT_SCHEMAS.announcements, req), text);
    case "delivery": return guardDelivery(await call(EXTRACT_SCHEMAS.delivery, req), text);
  }
}
