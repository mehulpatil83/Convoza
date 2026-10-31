import { z } from "zod";
import { ACTION_KINDS, ANALYZE_MAX_CHARS, TOPICS, type ActionKind, type ExtractKind, type Topic } from "./constants";
export { ACTION_KINDS, TOPICS, ACTION_INFO, ANALYZE_MAX_CHARS } from "./constants";
export type { ActionKind, ExtractKind, Topic } from "./constants";

/** Gemma job 3: understand a whole chat. */
export const AnalysisSchema = z.object({
  title: z.string().trim().min(1).max(80),
  topics: z.array(z.enum(TOPICS)).max(6).default([]),
  summary: z.string().trim().min(1).max(2000),
  keyPoints: z.array(z.object({ point: z.string().trim().min(1).max(220), source: z.string().trim().min(1).max(300) })).max(12).default([]),
  decisions: z.array(z.string().trim().min(1).max(220)).max(8).default([]),
  openQuestions: z.array(z.string().trim().min(1).max(220)).max(8).default([]),
  suggestions: z.array(z.object({ kind: z.enum(ACTION_KINDS), reason: z.string().trim().max(200).default("") })).max(7).default([]),
});
export type ModelAnalysis = z.infer<typeof AnalysisSchema>;

/** What the browser receives: the model's answer after the guard, plus facts counted by code. */
export interface ChatAnalysis {
  title: string;
  topics: Topic[];
  summary: string;
  keyPoints: { point: string; source: string }[];
  decisions: string[];
  openQuestions: string[];
  suggestions: { kind: ActionKind; reason: string }[];
  participants: { name: string; count: number }[];
  messageCount: number;
  /** Scam or OTP patterns found by the code-level filter, shown as a warning. */
  alerts: string[];
}

const S = { type: "string" } as const;
const NS = { type: ["string", "null"] } as const;

export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: S,
    topics: { type: "array", items: { type: "string", enum: [...TOPICS] } },
    summary: S,
    keyPoints: { type: "array", items: { type: "object", properties: { point: S, source: S }, required: ["point", "source"] } },
    decisions: { type: "array", items: S },
    openQuestions: { type: "array", items: S },
    suggestions: { type: "array", items: { type: "object", properties: { kind: { type: "string", enum: [...ACTION_KINDS] }, reason: S }, required: ["kind", "reason"] } },
  },
  required: ["title", "topics", "summary", "keyPoints", "decisions", "openQuestions", "suggestions"],
} as const;

/* ---------- Gemma job 4: pull one kind of structure out of a chat ---------- */

const nstr = (max: number) => z.string().trim().max(max).nullable().default(null);

export const TimelineSchema = z.object({
  title: z.string().trim().min(1).max(80),
  items: z.array(z.object({
    label: z.string().trim().min(1).max(120),
    detail: nstr(300),
    when: nstr(60),
    isoDate: nstr(10),
    owner: nstr(60),
    status: z.enum(["done", "in_progress", "upcoming", "unknown"]).default("unknown"),
    source: z.string().trim().min(1).max(300),
  })).max(40).default([]),
});

export const CalendarSchema = z.object({
  title: z.string().trim().min(1).max(80),
  events: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    isoDate: nstr(10),
    startTime: nstr(5),
    endTime: nstr(5),
    location: nstr(120),
    description: nstr(300),
    cancelled: z.boolean().default(false),
    source: z.string().trim().min(1).max(300),
  })).max(30).default([]),
});

export const ChecklistSchema = z.object({
  title: z.string().trim().min(1).max(80),
  items: z.array(z.object({
    task: z.string().trim().min(1).max(200),
    owner: nstr(60),
    due: nstr(60),
    done: z.boolean().default(false),
    source: z.string().trim().min(1).max(300),
  })).max(40).default([]),
});

export const ExpensesSchema = z.object({
  title: z.string().trim().min(1).max(80),
  items: z.array(z.object({
    what: z.string().trim().min(1).max(160),
    who: nstr(60),
    amount: z.number().nonnegative().max(100000000).nullable().default(null),
    status: z.enum(["paid", "pending", "unknown"]).default("unknown"),
    source: z.string().trim().min(1).max(300),
  })).max(40).default([]),
});

export const AnnouncementsSchema = z.object({
  title: z.string().trim().min(1).max(80),
  items: z.array(z.object({
    headline: z.string().trim().min(1).max(140),
    detail: nstr(300),
    deadline: nstr(60),
    link: nstr(300),
    source: z.string().trim().min(1).max(300),
  })).max(30).default([]),
});

export const DeliverySchema = z.object({
  title: z.string().trim().min(1).max(80),
  items: z.array(z.object({
    item: z.string().trim().min(1).max(160),
    status: z.enum(["delivered", "in_transit", "expected", "pickup", "delayed", "missing", "unknown"]).default("unknown"),
    expected: nstr(60),
    detail: nstr(300),
    source: z.string().trim().min(1).max(300),
  })).max(40).default([]),
});

export type TimelineResult = z.infer<typeof TimelineSchema>;
export type CalendarResult = z.infer<typeof CalendarSchema>;
export type ChecklistResult = z.infer<typeof ChecklistSchema>;
export type ExpensesResult = z.infer<typeof ExpensesSchema>;
export type AnnouncementsResult = z.infer<typeof AnnouncementsSchema>;
export type DeliveryResult = z.infer<typeof DeliverySchema>;
export type ExtractResult = TimelineResult | CalendarResult | ChecklistResult | ExpensesResult | AnnouncementsResult | DeliveryResult;

const list = (props: Record<string, unknown>, required: string[]) => ({
  type: "object",
  properties: { title: S, items: { type: "array", items: { type: "object", properties: props, required } } },
  required: ["title", "items"],
});

export const EXTRACT_JSON_SCHEMAS: Record<ExtractKind, Record<string, unknown>> = {
  timeline: list({ label: S, detail: NS, when: NS, isoDate: NS, owner: NS, status: { type: "string", enum: ["done", "in_progress", "upcoming", "unknown"] }, source: S }, ["label", "detail", "when", "isoDate", "owner", "status", "source"]),
  calendar: {
    type: "object",
    properties: {
      title: S,
      events: { type: "array", items: { type: "object", properties: { title: S, isoDate: NS, startTime: NS, endTime: NS, location: NS, description: NS, cancelled: { type: "boolean" }, source: S }, required: ["title", "isoDate", "startTime", "endTime", "location", "description", "cancelled", "source"] } },
    },
    required: ["title", "events"],
  },
  checklist: list({ task: S, owner: NS, due: NS, done: { type: "boolean" }, source: S }, ["task", "owner", "due", "done", "source"]),
  expenses: list({ what: S, who: NS, amount: { type: ["number", "null"] }, status: { type: "string", enum: ["paid", "pending", "unknown"] }, source: S }, ["what", "who", "amount", "status", "source"]),
  announcements: list({ headline: S, detail: NS, deadline: NS, link: NS, source: S }, ["headline", "detail", "deadline", "link", "source"]),
  delivery: list({ item: S, status: { type: "string", enum: ["delivered", "in_transit", "expected", "pickup", "delayed", "missing", "unknown"] }, expected: NS, detail: NS, source: S }, ["item", "status", "expected", "detail", "source"]),
};

export const EXTRACT_SCHEMAS = { timeline: TimelineSchema, calendar: CalendarSchema, checklist: ChecklistSchema, expenses: ExpensesSchema, announcements: AnnouncementsSchema, delivery: DeliverySchema } as const;

export const AnalyzeBody = z.object({ text: z.string().trim().min(10, "Paste a longer chat to analyze.").max(ANALYZE_MAX_CHARS, `Paste up to ${ANALYZE_MAX_CHARS.toLocaleString("en-IN")} characters at a time.`) });
export const ExtractBody = z.object({ kind: z.enum(["timeline", "calendar", "checklist", "expenses", "announcements", "delivery"]), text: z.string().trim().min(10).max(ANALYZE_MAX_CHARS) });
