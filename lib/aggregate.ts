import type { ChatMessage } from "./parseChat";
import type { ReadResult } from "./schema";
import { normalizeText } from "./guard";

export type MessageStatus = "added" | "cancelled" | "ignored" | "needs_check";

export interface MessageReading {
  message: ChatMessage;
  /** null when the model could not read the message (error). */
  result: ReadResult | null;
  error?: string;
}

export interface OrderLine {
  sender: string;
  qty: number;
  source: string;
  messageId: number;
}

export interface OrderGroup {
  key: string;
  name: string;
  total: number;
  lines: OrderLine[];
  perSender: { sender: string; qty: number }[];
}

export interface Flag {
  id: string; // `${messageId}:${itemIndex}`
  messageId: number;
  sender: string;
  kind: "quantity" | "reference" | "unreadable";
  itemName?: string;
  question: string;
  source: string;
}

export interface CancelRecord {
  sender: string;
  name: string;
  removedQty: number;
  source: string;
}

export interface Understanding {
  status: MessageStatus;
  /** Plain-language summary of how the message was read. */
  understood: string;
  sourceWords: string[];
}

export interface OrderState {
  groups: OrderGroup[];
  flags: Flag[];
  cancelled: CancelRecord[];
  totalItems: number;
  understanding: Record<number, Understanding>;
}

/** Hindi/English shorthand → comparable key. "Pens" and "pen" match; "glass" stays "glass". */
export function singularize(word: string): string {
  const w = word.trim();
  if (w.length > 3 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function baseKey(name: string): string {
  return normalizeText(name).split(" ").map(singularize).join(" ");
}

export function variantKey(variant: string | null | undefined): string {
  return variant ? normalizeText(variant).split(" ").map(singularize).join(" ") : "";
}

export function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function displayName(name: string, variant: string | null | undefined): string {
  const base = titleCase(singularize(normalizeText(name)));
  const v = variant ? titleCase(variant.trim()) : "";
  return v ? `${v} ${base}` : base;
}

export function flagQuestion(name: string): string {
  return `How many ${titleCase(normalizeText(name))} should I add?`;
}

/**
 * Deterministic order engine. Applies adds and cancels in chat order, groups items,
 * and raises a flag instead of guessing whenever a quantity or reference is missing.
 * `resolutions` holds quantities the organiser typed in for flagged items.
 */
export function buildOrder(
  readings: MessageReading[],
  resolutions: Record<string, number> = {},
): OrderState {
  const groups = new Map<string, OrderGroup & { base: string; variant: string }>();
  const flags: Flag[] = [];
  const cancelled: CancelRecord[] = [];
  const understanding: Record<number, Understanding> = {};

  const recompute = (g: OrderGroup) => {
    g.total = g.lines.reduce((a, l) => a + l.qty, 0);
    const by = new Map<string, number>();
    for (const l of g.lines) by.set(l.sender, (by.get(l.sender) ?? 0) + l.qty);
    g.perSender = [...by].map(([sender, qty]) => ({ sender, qty }));
  };

  for (const { message, result, error } of readings) {
    const m = message;
    if (!result) {
      flags.push({
        id: `${m.id}:err`, messageId: m.id, sender: m.sender, kind: "unreadable",
        question: error ?? "I couldn't read this message. Try again.", source: m.text,
      });
      understanding[m.id] = { status: "needs_check", understood: "Couldn't be read. Try again.", sourceWords: [m.text] };
      continue;
    }

    if (result.intent === "chatter" && result.items.length === 0 && !result.unclear) {
      understanding[m.id] = { status: "ignored", understood: "Not an order. Nothing to add.", sourceWords: [m.text] };
      continue;
    }

    if (result.items.length === 0) {
      flags.push({
        id: `${m.id}:ref`, messageId: m.id, sender: m.sender, kind: "reference",
        question: "This message refers to something I can't pin down. What should be added?", source: m.text,
      });
      understanding[m.id] = {
        status: "needs_check",
        understood: "Refers to something unclear, such as another person's order. Asking instead of guessing.",
        sourceWords: [m.text],
      };
      continue;
    }

    const notes: string[] = [];
    const sources: string[] = [];
    let flagged = false;
    let added = false;
    let cancelledAny = false;

    result.items.forEach((item, idx) => {
      sources.push(item.source);
      const label = displayName(item.name, item.variant);
      if (result.intent === "cancel") {
        cancelledAny = true;
        let removed = 0;
        const bk = baseKey(item.name);
        const vk = variantKey(item.variant);
        for (const [key, g] of groups) {
          if (g.base !== bk || (vk && g.variant !== vk)) continue;
          const keep = g.lines.filter((l) => l.sender !== m.sender);
          removed += g.lines.reduce((a, l) => a + (l.sender === m.sender ? l.qty : 0), 0);
          g.lines = keep;
          if (keep.length === 0) groups.delete(key);
          else recompute(g);
        }
        cancelled.push({ sender: m.sender, name: label, removedQty: removed, source: item.source });
        notes.push(`Remove ${label}`);
        return;
      }

      const flagId = `${m.id}:${idx}`;
      const qty = item.quantity ?? resolutions[flagId] ?? null;
      if (qty === null || qty <= 0) {
        flagged = true;
        flags.push({
          id: flagId, messageId: m.id, sender: m.sender, kind: "quantity", itemName: label,
          question: flagQuestion(displayName(item.name, null)), source: item.source,
        });
        notes.push(`${label}: quantity missing. Asking`);
        return;
      }
      const bk = baseKey(item.name);
      const vk = variantKey(item.variant);
      const key = `${bk}|${vk}`;
      let g = groups.get(key);
      if (!g) {
        g = { key, name: label, total: 0, lines: [], perSender: [], base: bk, variant: vk };
        groups.set(key, g);
      }
      g.lines.push({ sender: m.sender, qty, source: item.source, messageId: m.id });
      recompute(g);
      added = true;
      notes.push(`Add ${label} × ${qty}`);
    });

    const status: MessageStatus = flagged ? "needs_check" : cancelledAny ? "cancelled" : added ? "added" : "ignored";
    understanding[m.id] = { status, understood: notes.join("; "), sourceWords: sources };
  }

  const list = [...groups.values()].map(({ base: _b, variant: _v, ...g }) => g);
  return {
    groups: list,
    flags,
    cancelled,
    totalItems: list.reduce((a, g) => a + g.total, 0),
    understanding,
  };
}

/** Text to paste to the shop. */
export function orderToShopText(state: OrderState, title = "Today's Convoza", totalPaise?: number, formatTotal?: (p: number) => string): string {
  const lines = [`🧾 ${title}`, ...state.groups.map((g) => `${g.total} × ${g.name}`)];
  if (totalPaise !== undefined && totalPaise > 0 && formatTotal) lines.push(`Total — ${formatTotal(totalPaise)}`);
  return lines.join("\n");
}

export function orderToCsv(state: OrderState, prices: Record<string, number | null> = {}): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["Item", "Person", "Qty", "Unit price (paise)", "Line total (paise)", "Source"].map(esc).join(",")];
  for (const g of state.groups) {
    const price = prices[g.key] ?? null;
    for (const l of g.lines) {
      rows.push([g.name, l.sender, l.qty, price ?? "", price === null ? "" : price * l.qty, l.source].map(esc).join(","));
    }
  }
  return rows.join("\n");
}
