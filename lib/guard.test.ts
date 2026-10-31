import { describe, expect, it } from "vitest";
import { guardRead, isTrivialChatter, normalizeText, quoteInText } from "./guard";
import type { ReadResult } from "./schema";

const res = (items: ReadResult["items"], intent: ReadResult["intent"] = "order", unclear = false): ReadResult => ({ intent, items, unclear });

describe("quoteInText", () => {
  it("finds an exact quote", () => expect(quoteInText("2 blue notebooks", "hey 2 blue notebooks bhej dena")).toBe(true));
  it("ignores case and spacing", () => expect(quoteInText("2  Blue Notebooks", "2 blue notebooks")).toBe(true));
  it("rejects invented quotes", () => expect(quoteInText("5 red pens", "2 blue notebooks")).toBe(false));
  it("rejects empty quotes", () => expect(quoteInText("  ", "anything")).toBe(false));
  it("ignores curly quotes", () => expect(quoteInText("didn't", "didn\u2019t")).toBe(true));
});

describe("normalizeText", () => {
  it("lowercases and collapses whitespace", () => expect(normalizeText("  A  B\n C ")).toBe("a b c"));
});

describe("guardRead", () => {
  it("keeps items whose quote is in the message", () => {
    const out = guardRead(res([{ name: "notebook", variant: "blue", quantity: 2, source: "2 blue notebooks" }]), "2 blue notebooks bhej dena");
    expect(out.result.items).toHaveLength(1);
    expect(out.dropped).toBe(0);
  });
  it("rejects hallucinated items", () => {
    const out = guardRead(res([
      { name: "notebook", variant: null, quantity: 2, source: "2 notebooks" },
      { name: "stapler", variant: null, quantity: 1, source: "one stapler" },
    ]), "2 notebooks please");
    expect(out.result.items.map((i) => i.name)).toEqual(["notebook"]);
    expect(out.dropped).toBe(1);
  });
  it("collapses repeated items", () => {
    const item = { name: "pen", variant: null, quantity: 2, source: "2 pen" };
    const out = guardRead(res([item, { ...item }]), "2 pen");
    expect(out.result.items).toHaveLength(1);
    expect(out.dropped).toBe(1);
  });
  it("turns a fully hallucinated order into a question for a human", () => {
    const out = guardRead(res([{ name: "stapler", variant: null, quantity: 1, source: "a stapler" }]), "hello there");
    expect(out.result.items).toHaveLength(0);
    expect(out.result.unclear).toBe(true);
    expect(out.result.intent).toBe("order");
  });
  it("leaves chatter alone", () => {
    const out = guardRead(res([], "chatter"), "ok");
    expect(out.result).toEqual({ intent: "chatter", items: [], unclear: false });
  });
});

describe("isTrivialChatter", () => {
  it.each(["ok", "OK 👍", "thanks!", "done", "👍", "🙏🙏", "haan", "theek hai", "hmm"])("treats %s as chatter", (t) =>
    expect(isTrivialChatter(t)).toBe(true));
  it.each(["2 pens", "ok 2 pens", "kuch pens bhi", "same as Rahul"])("sends %s to the model", (t) =>
    expect(isTrivialChatter(t)).toBe(false));
});
