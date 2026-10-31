const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
  "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below100(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (r) parts.push(below100(r));
  return parts.join(" ");
}

/** Whole number in the Indian system: Thousand, Lakh, Crore (Crore repeats above 99). */
export function numberToIndianWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("Expected a non-negative integer");
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

/** 1234567 paise -> "Rupees Twelve Thousand Three Hundred Forty Five and Sixty Seven Paise Only". */
export function amountInWords(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) throw new RangeError("Expected non-negative paise");
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  if (rupees === 0 && p === 0) return "Rupees Zero Only";
  const parts: string[] = [];
  if (rupees > 0 || p === 0) parts.push(`Rupees ${numberToIndianWords(rupees)}`);
  if (p > 0) parts.push(`${rupees > 0 ? "and " : ""}${numberToIndianWords(p)} Paise`);
  return `${parts.join(" ")} Only`;
}
