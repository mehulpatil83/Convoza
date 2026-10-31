import type { ChatMessage } from "../parseChat";
import { normalizeText, quoteInText } from "../guard";
import { isValidIsoDate, isValidTime } from "../calendar";
import type {
  ActionKind, AnnouncementsResult, CalendarResult, ChatAnalysis, ChecklistResult, DeliveryResult,
  ExpensesResult, ModelAnalysis, TimelineResult, Topic,
} from "./schema";

/** Topic the model found -> the tool that fits it. Code adds these so a missed suggestion never hides the right tool. */
const TOPIC_TOOL: Partial<Record<Topic, { kind: ActionKind; reason: string }>> = {
  order: { kind: "receipt", reason: "People are asking for items to buy." },
  payment: { kind: "expenses", reason: "The chat mentions payments or shared costs." },
  task: { kind: "checklist", reason: "The chat assigns tasks or deadlines." },
  event: { kind: "calendar", reason: "The chat plans an event or a meeting time." },
  announcement: { kind: "announcements", reason: "The chat shares notices or deadlines." },
  delivery: { kind: "delivery", reason: "The chat tracks deliveries or pickups." },
  project: { kind: "timeline", reason: "The chat is about a project with steps and dates." },
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function uniqueStrings(list: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = clean(raw);
    const k = normalizeText(s);
    if (!s || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export function participantsOf(messages: ChatMessage[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of messages) counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

/** Keep only key points that quote words really in the chat, dedupe suggestions, and add the tools the topics call for. */
export function guardAnalysis(raw: ModelAnalysis, text: string, messages: ChatMessage[], alerts: string[] = []): ChatAnalysis {
  const keyPoints = raw.keyPoints
    .filter((k) => quoteInText(k.source, text))
    .map((k) => ({ point: clean(k.point), source: clean(k.source) }));

  const topics = [...new Set(raw.topics)];
  const suggestions: { kind: ActionKind; reason: string }[] = [];
  const add = (kind: ActionKind, reason: string) => {
    if (suggestions.some((s) => s.kind === kind)) return;
    if (kind === "receipt" && messages.length === 0) return; // the order builder needs separate messages
    suggestions.push({ kind, reason: clean(reason) });
  };
  for (const s of raw.suggestions) add(s.kind, s.reason);
  for (const t of topics) { const tool = TOPIC_TOOL[t]; if (tool) add(tool.kind, tool.reason); }

  return {
    title: clean(raw.title),
    topics,
    summary: raw.summary.trim(),
    keyPoints,
    decisions: uniqueStrings(raw.decisions, 8),
    openQuestions: uniqueStrings(raw.openQuestions, 8),
    suggestions: suggestions.slice(0, 5),
    participants: participantsOf(messages),
    messageCount: messages.length,
    alerts,
  };
}

/* ---------- extraction guards: every item must quote real chat words ---------- */

const dropUnquoted = <T extends { source: string }>(items: T[], text: string): T[] => items.filter((i) => quoteInText(i.source, text));
const cleanDate = (s: string | null) => (isValidIsoDate(s) ? s : null);

export function guardTimeline(r: TimelineResult, text: string): TimelineResult {
  const items = dropUnquoted(r.items, text).map((i) => ({ ...i, isoDate: cleanDate(i.isoDate) }));
  // Sort by date only when every step has one; otherwise keep the order of the chat.
  if (items.length > 1 && items.every((i) => i.isoDate)) items.sort((a, b) => a.isoDate!.localeCompare(b.isoDate!));
  return { ...r, items };
}

export function guardCalendar(r: CalendarResult, text: string): CalendarResult {
  const events = dropUnquoted(r.events, text).map((e) => {
    const start = isValidTime(e.startTime) ? e.startTime : null;
    return { ...e, isoDate: cleanDate(e.isoDate), startTime: start, endTime: start && isValidTime(e.endTime) ? e.endTime : null };
  });
  return { ...r, events };
}

export function guardChecklist(r: ChecklistResult, text: string): ChecklistResult {
  return { ...r, items: dropUnquoted(r.items, text) };
}

/** An amount stays only if its digits are written in the quote. The model never invents money. */
export function amountAppearsIn(amount: number, source: string): boolean {
  const digits = source.replace(/,/g, "");
  return new RegExp(`(?<![\\d.])${String(amount).replace(".", "\\.")}(?![\\d])`).test(digits);
}

export function guardExpenses(r: ExpensesResult, text: string): ExpensesResult {
  const items = dropUnquoted(r.items, text).map((i) => ({ ...i, amount: i.amount !== null && amountAppearsIn(i.amount, i.source) ? i.amount : null }));
  return { ...r, items };
}

export function guardAnnouncements(r: AnnouncementsResult, text: string): AnnouncementsResult {
  const items = dropUnquoted(r.items, text).map((i) => ({ ...i, link: i.link && /^https?:\/\//i.test(i.link) && text.includes(i.link) ? i.link : null }));
  return { ...r, items };
}

export function guardDelivery(r: DeliveryResult, text: string): DeliveryResult {
  return { ...r, items: dropUnquoted(r.items, text) };
}
