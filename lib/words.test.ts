import { describe, expect, it } from "vitest";
import { amountInWords, numberToIndianWords } from "./words";

describe("numberToIndianWords", () => {
  it.each([
    [0, "Zero"], [7, "Seven"], [19, "Nineteen"], [20, "Twenty"], [45, "Forty Five"], [100, "One Hundred"],
    [101, "One Hundred One"], [1000, "One Thousand"], [12345, "Twelve Thousand Three Hundred Forty Five"],
    [100000, "One Lakh"], [1234567, "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven"],
    [10000000, "One Crore"], [120000000, "Twelve Crore"], [1000000000, "One Hundred Crore"],
  ])("%i", (n, w) => expect(numberToIndianWords(n)).toBe(w));
  it("rejects negatives and fractions", () => {
    expect(() => numberToIndianWords(-1)).toThrow();
    expect(() => numberToIndianWords(1.5)).toThrow();
  });
});

describe("amountInWords", () => {
  it("whole rupees", () => expect(amountInWords(44000)).toBe("Rupees Four Hundred Forty Only"));
  it("rupees and paise", () => expect(amountInWords(125050)).toBe("Rupees One Thousand Two Hundred Fifty and Fifty Paise Only"));
  it("paise only", () => expect(amountInWords(5)).toBe("Five Paise Only"));
  it("zero", () => expect(amountInWords(0)).toBe("Rupees Zero Only"));
  it("lakhs", () => expect(amountInWords(1200000000)).toBe("Rupees One Crore Twenty Lakh Only"));
  it("twelve lakh", () => expect(amountInWords(120000000)).toBe("Rupees Twelve Lakh Only"));
  it("rejects bad input", () => expect(() => amountInWords(-5)).toThrow());
});
