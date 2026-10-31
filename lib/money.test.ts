import { describe, expect, it } from "vitest";
import { formatPaise, groupIndian, lineTotal, parsePriceToPaise, splitEvenly, sumPaise } from "./money";

describe("parsePriceToPaise", () => {
  it.each([
    ["12", 1200], ["12.5", 1250], ["12.50", 1250], ["0.05", 5], ["0", 0], ["₹1,200.75", 120075], [" 45 ", 4500], ["Rs 30", 3000],
    [12, 1200], ["1,25,000", 12500000],
  ])("parses %s", (input, expected) => expect(parsePriceToPaise(input as string)).toBe(expected));
  it.each(["", "abc", "-5", "1.234", "1..2", "12.", ".5", "1e3"])("rejects %s", (input) =>
    expect(parsePriceToPaise(input)).toBeNull());
  it("rejects null and undefined", () => {
    expect(parsePriceToPaise(null)).toBeNull();
    expect(parsePriceToPaise(undefined)).toBeNull();
  });
});

describe("groupIndian / formatPaise", () => {
  it.each([[0, "0"], [999, "999"], [1000, "1,000"], [100000, "1,00,000"], [1234567, "12,34,567"], [123456789, "12,34,56,789"]])(
    "groups %i", (n, s) => expect(groupIndian(n)).toBe(s));
  it("formats whole rupees without decimals", () => expect(formatPaise(125000)).toBe("₹1,250"));
  it("formats paise", () => expect(formatPaise(125050)).toBe("₹1,250.50"));
  it("pads single-digit paise", () => expect(formatPaise(1205)).toBe("₹12.05"));
  it("formats zero", () => expect(formatPaise(0)).toBe("₹0"));
  it("formats negatives", () => expect(formatPaise(-500)).toBe("-₹5"));
});

describe("lineTotal / sumPaise", () => {
  it("multiplies qty by unit price", () => expect(lineTotal(7, 1050)).toBe(7350));
  it("sums", () => expect(sumPaise([100, 250, 5])).toBe(355));
  it("sums nothing", () => expect(sumPaise([])).toBe(0));
});

describe("splitEvenly", () => {
  it("splits exactly", () => expect(splitEvenly(900, 3)).toEqual([300, 300, 300]));
  it("hands out extra paise", () => expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]));
  it("always adds up", () => {
    for (const total of [1, 7, 99, 1001, 123457]) for (const n of [1, 2, 3, 7, 11]) {
      expect(sumPaise(splitEvenly(total, n))).toBe(total);
    }
  });
  it("shares differ by at most one paisa", () => {
    const s = splitEvenly(10001, 7);
    expect(Math.max(...s) - Math.min(...s)).toBeLessThanOrEqual(1);
  });
  it("returns nothing for zero people", () => expect(splitEvenly(100, 0)).toEqual([]));
});
