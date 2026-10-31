import type { ReadItem, ReadResult } from "./schema";

/** Lowercase, strip quotes/punctuation noise and collapse whitespace so quotes can be matched reliably. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True only if the quoted words really appear in the message. */
export function quoteInText(quote: string, text: string): boolean {
  const q = normalizeText(quote);
  if (q.length === 0) return false;
  return normalizeText(text).includes(q);
}

export interface GuardOutcome {
  result: ReadResult;
  /** Items removed because their quote wasn't in the message, or they were repeats. */
  dropped: number;
}

/**
 * Zero-hallucination guard. Every parsed item must quote its exact source words from the message.
 * Items without a real quote are rejected, and repeated items are collapsed.
 */
export function guardRead(result: ReadResult, messageText: string): GuardOutcome {
  const seen = new Set<string>();
  const kept: ReadItem[] = [];
  let dropped = 0;
  for (const item of result.items) {
    if (!quoteInText(item.source, messageText)) {
      dropped++;
      continue;
    }
    const key = [normalizeText(item.name), normalizeText(item.variant ?? ""), item.quantity ?? "?"].join("|");
    if (seen.has(key)) {
      dropped++;
      continue;
    }
    seen.add(key);
    kept.push(item);
  }
  // If the model claimed an order/cancel but nothing survived, don't trust it: ask a human.
  const lostEverything = result.items.length > 0 && kept.length === 0;
  return {
    result: {
      intent: lostEverything ? "order" : result.intent,
      items: kept,
      unclear: result.unclear || lostEverything,
    },
    dropped,
  };
}

const TRIVIAL = /^(ok|okay|okk|k|kk|thanks|thank you|thx|ty|done|haan|ha|ji|hmm+|hm+|yes|yep|no|nope|sure|noted|cool|great|nice|lol|accha|theek hai|thik hai)[\s.!,\u{1F44D}\u{1F64F}\u{1F44C}\u{1F60A}]*$/iu;
const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f\s]+$/u;

/** Messages that are obviously not orders skip the model entirely. */
export function isTrivialChatter(text: string): boolean {
  const t = text.trim();
  return t.length === 0 || TRIVIAL.test(t) || EMOJI_ONLY.test(t);
}
