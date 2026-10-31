import { describe, expect, it } from "vitest";
import { parseChat } from "../parseChat";
import { amountAppearsIn, guardAnalysis, guardAnnouncements, guardCalendar, guardExpenses, guardTimeline } from "./guard";
import type { ModelAnalysis } from "./schema";

const chat = "Meera: Design is due 15 Nov\nKabir: I will send the logo by Monday\nMeera: Pay at https://pay.example.com, I paid 450 for the cake";
const base: ModelAnalysis = { title: "Plan", topics: [], summary: "A summary.", keyPoints: [], decisions: [], openQuestions: [], suggestions: [] };

describe("guardAnalysis", () => {
  it("drops key points whose quote is not in the chat", () => {
    const out = guardAnalysis({ ...base, keyPoints: [{ point: "ok", source: "due 15 Nov" }, { point: "made up", source: "launch is 1 Dec" }] }, chat, parseChat(chat));
    expect(out.keyPoints.map((k) => k.point)).toEqual(["ok"]);
  });
  it("adds the tool a topic calls for and removes repeats", () => {
    const out = guardAnalysis({ ...base, topics: ["project", "event"], suggestions: [{ kind: "timeline", reason: "dated steps" }, { kind: "timeline", reason: "again" }] }, chat, parseChat(chat));
    expect(out.suggestions.map((s) => s.kind)).toEqual(["timeline", "calendar"]);
  });
  it("offers no receipt when the text has no separate messages", () => {
    const text = "need 2 notebooks and 3 pens for the office please";
    const out = guardAnalysis({ ...base, topics: ["order"], suggestions: [{ kind: "receipt", reason: "items" }] }, text, parseChat(text));
    expect(out.suggestions).toEqual([]);
  });
  it("counts people and messages in code", () => {
    const out = guardAnalysis(base, chat, parseChat(chat));
    expect(out.participants).toEqual([{ name: "Meera", count: 2 }, { name: "Kabir", count: 1 }]);
    expect(out.messageCount).toBe(3);
  });
});

describe("extraction guards", () => {
  it("keeps only events that quote the chat and clears bad dates and times", () => {
    const out = guardCalendar({ title: "t", events: [
      { title: "A", isoDate: "2026-02-30", startTime: "25:00", endTime: "26:00", location: null, description: null, cancelled: false, source: "due 15 Nov" },
      { title: "B", isoDate: "2026-11-15", startTime: null, endTime: "10:00", location: null, description: null, cancelled: false, source: "not in chat" },
    ] }, chat);
    expect(out.events).toHaveLength(1);
    expect(out.events[0]).toMatchObject({ isoDate: null, startTime: null, endTime: null });
  });
  it("sorts a timeline by date only when every step has one", () => {
    const item = (label: string, isoDate: string | null) => ({ label, detail: null, when: null, isoDate, owner: null, status: "upcoming" as const, source: "due 15 Nov" });
    expect(guardTimeline({ title: "t", items: [item("b", "2026-12-01"), item("a", "2026-11-15")] }, chat).items.map((i) => i.label)).toEqual(["a", "b"]);
    expect(guardTimeline({ title: "t", items: [item("b", "2026-12-01"), item("a", null)] }, chat).items.map((i) => i.label)).toEqual(["b", "a"]);
  });
  it("keeps an amount only if it is written in the quote", () => {
    expect(amountAppearsIn(450, "I paid 450 for the cake")).toBe(true);
    expect(amountAppearsIn(45, "I paid 450 for the cake")).toBe(false);
    const out = guardExpenses({ title: "t", items: [{ what: "cake", who: "Meera", amount: 500, status: "paid", source: "I paid 450 for the cake" }] }, chat);
    expect(out.items[0].amount).toBeNull();
  });
  it("keeps a link only if it is in the chat", () => {
    const mk = (link: string) => ({ title: "t", items: [{ headline: "Pay", detail: null, deadline: null, link, source: "Pay at https://pay.example.com" }] });
    expect(guardAnnouncements(mk("https://pay.example.com"), chat).items[0].link).toBe("https://pay.example.com");
    expect(guardAnnouncements(mk("https://evil.example"), chat).items[0].link).toBeNull();
  });
});
