// All money is integer paise. Never use floats for rupees.

/** Parse a user-typed rupee amount ("12", "12.5", "₹1,200.75") into paise. Returns null if invalid. */
export function parsePriceToPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  if (raw === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [rupees, frac = ""] = raw.split(".");
  const paise = Number(rupees) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** Indian digit grouping: 1250000 -> "12,50,000". */
export function groupIndian(n: number): string {
  const s = String(Math.trunc(Math.abs(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/** 125050 -> "₹1,250.50", 125000 -> "₹1,250". */
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;
  return `${sign}₹${groupIndian(rupees)}${p ? "." + String(p).padStart(2, "0") : ""}`;
}

export function lineTotal(qty: number, unitPaise: number): number {
  return Math.round(qty) * unitPaise;
}

export function sumPaise(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Split a total into n shares that add up to the paisa. Earlier shares get the extra paise. */
export function splitEvenly(totalPaise: number, n: number): number[] {
  if (!Number.isInteger(n) || n <= 0) return [];
  const base = Math.floor(totalPaise / n);
  const extra = totalPaise - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}
