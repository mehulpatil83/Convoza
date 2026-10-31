import { amountInWords } from "./words";
import { formatPaise, lineTotal, splitEvenly, sumPaise } from "./money";
import type { OrderState } from "./aggregate";
import type { Role } from "./roles";

export interface BillLine {
  name: string;
  qty: number;
  unitPaise: number;
  totalPaise: number;
}

export interface BillPerson {
  name: string;
  lines: BillLine[];
  itemsPaise: number;
  /** This person's share of any shared charge (delivery, packing). */
  sharePaise: number;
  totalPaise: number;
}

export interface Bill {
  id: string;
  number: string;
  createdAt: string; // ISO
  dateIST: string;
  mode: "group" | "shop" | "personal";
  from: string;
  to: string;
  people: BillPerson[];
  sharedChargePaise: number;
  grandPaise: number;
  words: string;
  upiId?: string;
}

export function formatDateIST(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(d);
}

export function billNumber(d: Date, serial: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(d).replace(/-/g, "");
  return `CVZ-${parts}-${String(serial % 10000).padStart(4, "0")}`;
}

/** Rows that have a price → each person's lines. People with no priced items are left out. */
export function peopleFromOrder(order: OrderState, prices: Record<string, number | null>): BillPerson[] {
  const by = new Map<string, BillLine[]>();
  for (const g of order.groups) {
    const unit = prices[g.key];
    if (unit === null || unit === undefined) continue;
    for (const s of g.perSender) {
      const arr = by.get(s.sender) ?? [];
      arr.push({ name: g.name, qty: s.qty, unitPaise: unit, totalPaise: lineTotal(s.qty, unit) });
      by.set(s.sender, arr);
    }
  }
  return [...by].map(([name, lines]) => {
    const itemsPaise = sumPaise(lines.map((l) => l.totalPaise));
    return { name, lines, itemsPaise, sharePaise: 0, totalPaise: itemsPaise };
  });
}

/** "Who owes what" without any shared charge. */
export function whoOwes(order: OrderState, prices: Record<string, number | null>): { name: string; paise: number }[] {
  return peopleFromOrder(order, prices).map((p) => ({ name: p.name, paise: p.itemsPaise }));
}

export function grandTotal(order: OrderState, prices: Record<string, number | null>): number {
  return sumPaise(order.groups.map((g) => (prices[g.key] == null ? 0 : lineTotal(g.total, prices[g.key] as number))));
}

export interface BillParams {
  role: Role;
  order: OrderState;
  prices: Record<string, number | null>;
  fromName: string;
  groupName?: string;
  sharedChargePaise?: number;
  upiId?: string;
  now?: Date;
  /** Injected for tests; defaults to a random id. */
  makeId?: () => string;
  serial?: number;
}

function defaultId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function withShare(people: BillPerson[], shared: number): BillPerson[] {
  if (people.length === 0) return [];
  const shares = splitEvenly(shared, people.length);
  return people.map((p, i) => ({ ...p, sharePaise: shares[i], totalPaise: p.itemsPaise + shares[i] }));
}

function makeBill(base: Omit<Bill, "grandPaise" | "words">): Bill {
  const grandPaise = sumPaise(base.people.map((p) => p.totalPaise));
  return { ...base, grandPaise, words: amountInWords(grandPaise) };
}

/**
 * The role decides who the bill is from and to:
 * - merchant: one bill per customer, from the shop
 * - community: one bill for the group, split per person to the paisa
 * - consumer: one bill from the shop to you
 */
export function createBills(p: BillParams): Bill[] {
  const now = p.now ?? new Date();
  const mk = p.makeId ?? defaultId;
  const serial = p.serial ?? Math.floor(Math.random() * 10000);
  const people = peopleFromOrder(p.order, p.prices);
  const shared = Math.max(0, p.sharedChargePaise ?? 0);
  const common = { createdAt: now.toISOString(), dateIST: formatDateIST(now), upiId: p.upiId || undefined };

  if (p.role === "merchant") {
    // Shared charge is split across customers; each gets their own bill.
    return withShare(people, shared).map((person, i) =>
      makeBill({
        ...common, id: mk(), number: billNumber(now, serial + i), mode: "shop",
        from: p.fromName || "Shop", to: person.name, people: [person], sharedChargePaise: person.sharePaise,
      }),
    );
  }
  if (p.role === "community") {
    const split = withShare(people, shared);
    return [
      makeBill({
        ...common, id: mk(), number: billNumber(now, serial), mode: "group",
        from: p.groupName || p.fromName || "Group", to: "Members", people: split, sharedChargePaise: shared,
      }),
    ];
  }
  // consumer: everything on one bill addressed to "You"
  const lines = people.flatMap((x) => x.lines);
  const merged: BillPerson = {
    name: "You", lines, itemsPaise: sumPaise(lines.map((l) => l.totalPaise)), sharePaise: shared,
    totalPaise: sumPaise(lines.map((l) => l.totalPaise)) + shared,
  };
  return [
    makeBill({
      ...common, id: mk(), number: billNumber(now, serial), mode: "personal",
      from: p.fromName || "Shop", to: "You", people: lines.length ? [merged] : [], sharedChargePaise: shared,
    }),
  ];
}

export function billToText(bill: Bill): string {
  const out = [`🧾 Bill ${bill.number}`, `${bill.dateIST} (IST)`, `From: ${bill.from}  To: ${bill.to}`, ""];
  for (const person of bill.people) {
    if (bill.mode !== "personal" && bill.people.length > 0) out.push(`${person.name}`);
    for (const l of person.lines) out.push(`${l.qty} × ${l.name} @ ${formatPaise(l.unitPaise)} = ${formatPaise(l.totalPaise)}`);
    if (person.sharePaise) out.push(`Shared charges: ${formatPaise(person.sharePaise)}`);
    if (bill.mode === "group") out.push(`→ ${person.name} owes ${formatPaise(person.totalPaise)}`);
    out.push("");
  }
  out.push(`Total — ${formatPaise(bill.grandPaise)}`, bill.words);
  return out.join("\n");
}

/** UPI deep link. Amount is written from paise so it never touches floats. */
export function upiLink(upiId: string, payeeName: string, paise: number, note: string): string {
  const am = `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
  const q = new URLSearchParams({ pa: upiId, pn: payeeName, am, cu: "INR", tn: note });
  return `upi://pay?${q.toString()}`;
}

export function isValidUpiId(s: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(s.trim());
}
