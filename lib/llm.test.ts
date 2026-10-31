import { describe, expect, it } from "vitest";
import { cleanJson, parseWith } from "./llmJson";
import { withRetry } from "./llm";
import { ReadResultSchema } from "./schema";
import { allow } from "./rateLimit";

describe("cleanJson / parseWith", () => {
  it("strips code fences", () => expect(cleanJson('```json\n{"a":1}\n```')).toBe('{"a":1}'));
  it("strips chatter around the object", () => expect(cleanJson('Sure! {"a":1} Hope that helps')).toBe('{"a":1}'));
  it("accepts a valid result and fills defaults", () => {
    const r = parseWith(ReadResultSchema, '{"intent":"chatter"}');
    expect(r).toEqual({ ok: true, data: { intent: "chatter", items: [], unclear: false } });
  });
  it("rejects bad shapes", () => expect(parseWith(ReadResultSchema, '{"intent":"buy"}').ok).toBe(false));
  it("rejects fractional quantities", () =>
    expect(parseWith(ReadResultSchema, '{"intent":"order","items":[{"name":"pen","quantity":1.5,"source":"x"}]}').ok).toBe(false));
  it("rejects non-JSON", () => expect(parseWith(ReadResultSchema, "nope").ok).toBe(false));
});

describe("withRetry", () => {
  it("retries transient errors then succeeds", async () => {
    let n = 0;
    const out = await withRetry(async () => { if (++n < 3) throw Object.assign(new Error("x"), { status: 503 }); return "ok"; }, 3, 1);
    expect(out).toBe("ok");
    expect(n).toBe(3);
  });
  it("does not retry client errors", async () => {
    let n = 0;
    await expect(withRetry(async () => { n++; throw Object.assign(new Error("bad"), { status: 400 }); }, 3, 1)).rejects.toThrow("bad");
    expect(n).toBe(1);
  });
});

describe("allow", () => {
  it("limits bursts", () => {
    const key = `k${Math.random()}`;
    const results = Array.from({ length: 5 }, () => allow(key, 3, 1000, 1));
    expect(results).toEqual([true, true, true, false, false]);
  });
  it("lets traffic through again after the window", () => {
    const key = `k${Math.random()}`;
    allow(key, 1, 1000, 1);
    expect(allow(key, 1, 1000, 2000)).toBe(true);
  });
});
