import { describe, expect, it } from "vitest";
import { baseKey, buildOrder, displayName, orderToCsv, orderToShopText, singularize, type MessageReading } from "./aggregate";
import type { ReadResult } from "./schema";

let id = 0;
const msg = (sender: string, text: string, result: ReadResult | null, error?: string): MessageReading => ({
  message: { id: id++, sender, text }, result, error,
});
const order = (sender: string, text: string, name: string, quantity: number | null, variant: string | null = null): MessageReading =>
  msg(sender, text, { intent: "order", items: [{ name, variant, quantity, source: text }], unclear: false });
const cancel = (sender: string, text: string, name: string, variant: string | null = null): MessageReading =>
  msg(sender, text, { intent: "cancel", items: [{ name, variant, quantity: null, source: text }], unclear: false });

const fresh = () => { id = 0; };

describe("naming", () => {
  it("singularizes", () => {
    expect(singularize("pens")).toBe("pen");
    expect(singularize("glass")).toBe("glass");
    expect(singularize("batteries")).toBe("battery");
    expect(singularize("gas")).toBe("gas");
  });
  it("matches plural and singular", () => expect(baseKey("Pens")).toBe(baseKey("pen")));
  it("builds display names", () => {
    expect(displayName("notebooks", "blue")).toBe("Blue Notebook");
    expect(displayName("a4 sheets", null)).toBe("A4 Sheet");
  });
});

describe("buildOrder", () => {
  it("groups items from many people", () => {
    fresh();
    const o = buildOrder([
      order("Rahul", "3 blue notebooks", "notebook", 3, "blue"),
      order("Ayush", "mere liye 2 blue notebook", "notebook", 2, "blue"),
      order("Ayush", "black pen bhi 2", "pen", 2, "black"),
    ]);
    expect(o.groups).toHaveLength(2);
    const nb = o.groups.find((g) => g.name === "Blue Notebook")!;
    expect(nb.total).toBe(5);
    expect(nb.perSender).toEqual([{ sender: "Rahul", qty: 3 }, { sender: "Ayush", qty: 2 }]);
    expect(o.totalItems).toBe(7);
  });
  it("applies a cancel to that person's lines only", () => {
    fresh();
    const o = buildOrder([
      order("Rahul", "2 red pen", "pen", 2, "red"),
      order("Sia", "4 red pen", "pen", 4, "red"),
      cancel("Rahul", "red pen nahi chahiye", "pen", "red"),
    ]);
    expect(o.groups[0].total).toBe(4);
    expect(o.groups[0].perSender).toEqual([{ sender: "Sia", qty: 4 }]);
    expect(o.cancelled[0]).toMatchObject({ sender: "Rahul", removedQty: 2 });
  });
  it("removes a group when its last line is cancelled", () => {
    fresh();
    const o = buildOrder([order("Rahul", "2 red pen", "pen", 2, "red"), cancel("Rahul", "red pen cancel", "pen", "red")]);
    expect(o.groups).toHaveLength(0);
    expect(o.totalItems).toBe(0);
  });
  it("a cancel without a variant removes all that person's pens", () => {
    fresh();
    const o = buildOrder([
      order("Rahul", "2 red pen", "pen", 2, "red"),
      order("Rahul", "1 blue pen", "pen", 1, "blue"),
      cancel("Rahul", "pen nahi chahiye ab", "pens"),
    ]);
    expect(o.groups).toHaveLength(0);
  });
  it("a cancel with a variant leaves other variants", () => {
    fresh();
    const o = buildOrder([
      order("Rahul", "2 red pen", "pen", 2, "red"),
      order("Rahul", "1 blue pen", "pen", 1, "blue"),
      cancel("Rahul", "red pen cancel", "pen", "red"),
    ]);
    expect(o.groups.map((g) => g.name)).toEqual(["Blue Pen"]);
  });
  it("a cancel that matches nothing is harmless", () => {
    fresh();
    const o = buildOrder([cancel("Rahul", "stapler nahi chahiye", "stapler")]);
    expect(o.groups).toHaveLength(0);
    expect(o.understanding[0].status).toBe("cancelled");
    expect(o.cancelled[0].removedQty).toBe(0);
  });
  it("flags a missing quantity instead of guessing", () => {
    fresh();
    const o = buildOrder([order("Priya", "kuch pens bhi", "pen", null)]);
    expect(o.groups).toHaveLength(0);
    expect(o.flags).toHaveLength(1);
    expect(o.flags[0]).toMatchObject({ kind: "quantity", question: "How many Pen should I add?" });
    expect(o.understanding[0].status).toBe("needs_check");
  });
  it("uses a typed-in quantity to resolve a flag", () => {
    fresh();
    const o = buildOrder([order("Priya", "kuch pens bhi", "pen", null)], { "0:0": 5 });
    expect(o.flags).toHaveLength(0);
    expect(o.groups[0]).toMatchObject({ name: "Pen", total: 5 });
    expect(o.understanding[0].status).toBe("added");
  });
  it("flags references to someone else's order", () => {
    fresh();
    const o = buildOrder([msg("Ayush", "mere liye bhi same", { intent: "order", items: [], unclear: true })]);
    expect(o.flags[0].kind).toBe("reference");
    expect(o.understanding[0].status).toBe("needs_check");
  });
  it("ignores chatter", () => {
    fresh();
    const o = buildOrder([msg("Rahul", "ok done", { intent: "chatter", items: [], unclear: false })]);
    expect(o.understanding[0].status).toBe("ignored");
    expect(o.flags).toHaveLength(0);
  });
  it("flags unreadable messages", () => {
    fresh();
    const o = buildOrder([msg("Rahul", "2 pens", null, "Gemma timed out")]);
    expect(o.flags[0]).toMatchObject({ kind: "unreadable", question: "Gemma timed out" });
  });
  it("applies adds and cancels in chat order", () => {
    fresh();
    const o = buildOrder([cancel("Rahul", "pen nahi chahiye", "pen"), order("Rahul", "2 pen", "pen", 2)]);
    expect(o.groups[0].total).toBe(2);
  });
  it("sums repeated adds by the same person", () => {
    fresh();
    const o = buildOrder([order("Rahul", "2 pen", "pen", 2), order("Rahul", "1 pen aur", "pens", 1)]);
    expect(o.groups[0].total).toBe(3);
    expect(o.groups[0].perSender).toEqual([{ sender: "Rahul", qty: 3 }]);
  });
  it("keeps the source quote on each line", () => {
    fresh();
    const o = buildOrder([order("Rahul", "3 blue notebooks", "notebook", 3, "blue")]);
    expect(o.groups[0].lines[0]).toMatchObject({ source: "3 blue notebooks", messageId: 0 });
  });
  it("marks multi-item messages with a flag as needing a check", () => {
    fresh();
    const o = buildOrder([
      msg("Sia", "2 pen aur kuch copy", {
        intent: "order", unclear: false,
        items: [
          { name: "pen", variant: null, quantity: 2, source: "2 pen" },
          { name: "notebook", variant: null, quantity: null, source: "kuch copy" },
        ],
      }),
    ]);
    expect(o.groups[0].total).toBe(2);
    expect(o.flags).toHaveLength(1);
    expect(o.understanding[0].status).toBe("needs_check");
  });
});

describe("exports", () => {
  it("writes the shop text", () => {
    fresh();
    const o = buildOrder([order("Rahul", "3 blue notebooks", "notebook", 3, "blue"), order("Rahul", "2 pen", "pen", 2)]);
    expect(orderToShopText(o)).toBe("🧾 Today's Convoza\n3 × Blue Notebook\n2 × Pen");
  });
  it("adds a total when given", () => {
    fresh();
    const o = buildOrder([order("Rahul", "2 pen", "pen", 2)]);
    expect(orderToShopText(o, "T", 2000, (p) => `₹${p / 100}`)).toContain("Total — ₹20");
  });
  it("writes CSV with quotes escaped", () => {
    fresh();
    const o = buildOrder([order("Rahul", 'the "good" pen', "pen", 2)]);
    const csv = orderToCsv(o, { "pen|": 1000 });
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain('""good""');
    expect(csv).toContain("2000");
  });
});
