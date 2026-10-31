import { callJson } from "../llmJson";
import { quoteInText } from "../guard";
import { POST_JSON_SCHEMA, PostCheckSchema, type PostCheck, type PostItem } from "./schema";
import { POST_SYSTEM, postUser } from "./prompt";

/** Strong scam patterns are blocked in code before the model is even asked. */
const SCAM_PATTERNS: { re: RegExp; reason: string; category: PostCheck["moderation"]["category"] }[] = [
  {
    re: /\b(share|send|give|tell|bhej\w*|bata\w*|de\w*)\b[^.\n]{0,30}\b(otp|upi\s*pin|cvv|atm\s*pin)\b/i,
    reason: "Never share an OTP or PIN with anyone.",
    category: "otp_scam",
  },
  {
    re: /\b(otp|upi\s*pin|cvv)\b[^.\n]{0,20}\b(bhej\w*|bata\w*|share|send|do|dena)\b/i,
    reason: "Never share an OTP or PIN with anyone.",
    category: "otp_scam",
  },
  {
    re: /\b(processing|verification|registration|refund)\s+fee\b/i,
    reason: "Posts that ask for upfront fees are blocked.",
    category: "advance_payment",
  },
];

export function prefilter(text: string): { blocked: false } | { blocked: true; reason: string; category: PostCheck["moderation"]["category"] } {
  for (const p of SCAM_PATTERNS) if (p.re.test(text)) return { blocked: true, reason: p.reason, category: p.category };
  return { blocked: false };
}

function priceAppearsIn(price: number, source: string): boolean {
  const digits = source.replace(/,/g, "");
  const asText = Number.isInteger(price) ? String(price) : String(price);
  return new RegExp(`(?<![\\d.])${asText.replace(".", "\\.")}(?![\\d])`).test(digits);
}

/** Keep an item only if its quote is in the post. Keep a price only if it is written in that quote. */
export function guardPost(check: PostCheck, text: string): PostCheck {
  const items: PostItem[] = [];
  for (const it of check.items) {
    if (!quoteInText(it.source, text)) continue;
    items.push({ ...it, price: it.price !== null && priceAppearsIn(it.price, it.source) ? it.price : null });
  }
  return { ...check, items };
}

export async function checkPost(author: string, text: string, call: typeof callJson = callJson): Promise<PostCheck> {
  const raw = await call(PostCheckSchema, { system: POST_SYSTEM, user: postUser(author, text), jsonSchema: POST_JSON_SCHEMA });
  return guardPost(raw, text);
}
