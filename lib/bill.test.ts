import { describe, expect, it } from "vitest";
import { buildOrder, type MessageReading } from "./aggregate";
import { billNumber, billToText, createBills, formatDateIST, grandTotal, isValidUpiId, upiLink, whoOwes } from "./bill";
import { sumPaise } from "./money";

let id = 0;
const o = (sender: string, name: string, qty: number): MessageReading => ({
  message: { id: id++, sender, text: `${qty} ${name}` },
  result: { intent: "order", unclear: false, items: [{ name, variant: null, quantity: qty, source: `${qty} ${name}` }] },
});
const order = () => {
  id = 0;
  return buildOrder([o("Rahul", "notebook", 3), o("Ayush", "notebook", 2), o("Ayush", "pen", 4), o("Sia", "pen", 3)]);
};
const prices = { "notebook|": 4000, "pen|": 1033 };
const now = new Date("2026-10-31T10:00:00Z");

describe("totals", () => {
  it("computes the grand total", () => expect(grandTotal(order(), prices)).toBe(5 * 4000 + 7 * 1033));
  it("ignores unpriced rows", () => expect(grandTotal(order(), { "notebook|": 4000 })).toBe(20000));
  it("computes who owes what", () => {
    expect(whoOwes(order(), prices)).toEqual([
      { name: "Rahul", paise: 12000 }, { name: "Ayush", paise: 8000 + 4132 }, { name: "Sia", paise: 3099 },
    ]);
  });
  it("per-person totals add up to the grand total", () =>
    expect(sumPaise(whoOwes(order(), prices).map((w) => w.paise))).toBe(grandTotal(order(), prices)));
});

describe("createBills", () => {
  const common = { order: order(), prices, fromName: "Sharma Stationers", now, makeId: (() => { let n = 0; return () => `id${n++}`; })(), serial: 7 };
  it("merchant: one bill per customer, from the shop", () => {
    const bills = createBills({ ...common, role: "merchant" });
    expect(bills.map((b) => b.to)).toEqual(["Rahul", "Ayush", "Sia"]);
    expect(bills.every((b) => b.from === "Sharma Stationers" && b.mode === "shop")).toBe(true);
    expect(bills.map((b) => b.number)).toEqual(["CVZ-20261031-0007", "CVZ-20261031-0008", "CVZ-20261031-0009"]);
  });
  it("community: one bill with a per-person split that adds up to the paisa", () => {
    const [bill] = createBills({ ...common, role: "community", groupName: "Hostel B", sharedChargePaise: 1000 });
    expect(bill.people).toHaveLength(3);
    expect(sumPaise(bill.people.map((p) => p.sharePaise))).toBe(1000);
    expect(bill.people.map((p) => p.sharePaise)).toEqual([334, 333, 333]);
    expect(sumPaise(bill.people.map((p) => p.totalPaise))).toBe(bill.grandPaise);
    expect(bill.grandPaise).toBe(grandTotal(order(), prices) + 1000);
    expect(bill.from).toBe("Hostel B");
  });
  it("consumer: a single bill addressed to you", () => {
    const [bill] = createBills({ ...common, role: "consumer", sharedChargePaise: 500 });
    expect(bill.to).toBe("You");
    expect(bill.people).toHaveLength(1);
    expect(bill.grandPaise).toBe(grandTotal(order(), prices) + 500);
  });
  it("writes the amount in Indian words", () => {
    const [bill] = createBills({ ...common, role: "consumer" });
    expect(bill.words).toMatch(/^Rupees .* Only$/);
  });
  it("merchant bills split a shared charge too", () => {
    const bills = createBills({ ...common, role: "merchant", sharedChargePaise: 100 });
    expect(sumPaise(bills.map((b) => b.grandPaise))).toBe(grandTotal(order(), prices) + 100);
  });
  it("makes no people when nothing is priced", () => {
    const [bill] = createBills({ ...common, role: "consumer", prices: {} });
    expect(bill.people).toEqual([]);
    expect(bill.grandPaise).toBe(0);
  });
  it("carries the UPI id", () => expect(createBills({ ...common, role: "consumer", upiId: "shop@upi" })[0].upiId).toBe("shop@upi"));
});

describe("dates and numbers", () => {
  it("uses the IST date in the bill number", () => expect(billNumber(new Date("2026-10-31T20:00:00Z"), 1)).toBe("CVZ-20261101-0001"));
  it("formats IST time", () => expect(formatDateIST(now)).toContain("3:30"));
});

describe("billToText", () => {
  it("lists lines and the total", () => {
    const [bill] = createBills({ order: order(), prices, fromName: "Shop", role: "consumer", now, serial: 1 });
    const text = billToText(bill);
    expect(text).toContain("Bill CVZ-20261031-0001");
    expect(text).toContain("Total — ₹");
  });
});

describe("UPI", () => {
  it("builds a deep link from paise", () => {
    const link = upiLink("shop@upi", "Sharma Stationers", 12050, "Convoza CVZ-1");
    expect(link).toContain("pa=shop%40upi");
    expect(link).toContain("am=120.50");
    expect(link.startsWith("upi://pay?")).toBe(true);
  });
  it.each(["name@oksbi", "9876543210@ybl", "a.b-c_d@paytm"])("accepts %s", (s) => expect(isValidUpiId(s)).toBe(true));
  it.each(["", "nope", "a@", "@upi", "a b@upi"])("rejects %s", (s) => expect(isValidUpiId(s)).toBe(false));
});
