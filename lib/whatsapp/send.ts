/**
 * WhatsApp Cloud API outbound messaging service.
 * Never called by the model. All sends go through this file.
 */

import { getWhatsAppConfig } from "./config";
import { withRetry } from "@/lib/llm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TextMessage {
  to: string;
  text: string;
  /** WhatsApp message ID to reply to (optional). */
  replyToMessageId?: string;
}

interface SendResult {
  messageId: string;
}

interface GraphApiResponse {
  messages?: { id: string }[];
  error?: { message: string; code: number };
}

// ── Customer service window ───────────────────────────────────────────────────

/**
 * WhatsApp allows free-form messages only within a 24-hour window after the
 * last inbound message from the user. Outside this window, only approved
 * template messages are permitted. We track the inbound timestamp and check it
 * here.
 *
 * @param lastInboundTimestamp Unix epoch SECONDS of the last inbound message.
 */
export function isWithinServiceWindow(lastInboundTimestamp: number): boolean {
  const nowMs = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  return nowMs - lastInboundTimestamp * 1000 < windowMs;
}

// ── Core send function ────────────────────────────────────────────────────────

/**
 * Send a plain text WhatsApp message.
 * Only call this when inside the customer service window.
 * Retries transient failures up to 3 times.
 */
export async function sendTextMessage(msg: TextMessage): Promise<SendResult> {
  const cfg = getWhatsAppConfig();
  const url = `${cfg.graphBase}/${cfg.phoneNumberId}/messages`;

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: msg.to,
    type: "text",
    text: { body: msg.text, preview_url: false },
  };

  if (msg.replyToMessageId) {
    body.context = { message_id: msg.replyToMessageId };
  }

  const send = async (): Promise<SendResult> => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GraphApiResponse;

    if (!res.ok || data.error) {
      const msg = data.error?.message ?? `WhatsApp API error ${res.status}`;
      const err = Object.assign(new Error(msg), { status: res.status });
      throw err;
    }

    const messageId = data.messages?.[0]?.id;
    if (!messageId) throw new Error("WhatsApp API returned no message ID.");
    return { messageId };
  };

  return withRetry(send, 3, 500);
}

/**
 * Mark an incoming message as read (shows double blue tick to sender).
 * Non-critical — failure is silently swallowed.
 */
export async function markRead(messageId: string): Promise<void> {
  try {
    const cfg = getWhatsAppConfig();
    const url = `${cfg.graphBase}/${cfg.phoneNumberId}/messages`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch {
    // Best-effort; do not propagate
  }
}

/**
 * Format a reply that tells the user what Convoza extracted from their message.
 * Keeps the response short (WhatsApp UI is narrow).
 */
export function formatExtractionReply(params: {
  intent: "order" | "cancel" | "chatter";
  items: { name: string; variant: string | null; quantity: number | null; source: string }[];
  unclear: boolean;
  dropped: number;
  skippedModel: boolean;
}): string {
  const { intent, items, unclear } = params;

  if (intent === "chatter" && items.length === 0) {
    return "Got it! 👍 I'm Convoza — send me an order to get started.";
  }

  if (unclear || (items.length === 0 && intent === "order")) {
    return (
      "🤔 I couldn't figure out exactly what you want. " +
      "Could you be more specific? For example: \"2 blue pens, 1 notebook\""
    );
  }

  if (intent === "cancel") {
    const names = items.map((i) => (i.variant ? `${i.variant} ${i.name}` : i.name)).join(", ");
    return `❌ Noted! Cancelling: ${names}.`;
  }

  // order
  const lines = items.map((i) => {
    const qty = i.quantity != null ? `${i.quantity}×` : "some";
    const label = i.variant ? `${i.variant} ${i.name}` : i.name;
    return `${qty} ${label}`;
  });

  const itemList = lines.join(", ");
  const footer = params.dropped > 0
    ? `\n\n_(${params.dropped} item${params.dropped > 1 ? "s" : ""} couldn't be verified and were skipped.)_`
    : "";

  return `✅ Order noted!\n${itemList}${footer}\n\nReply CONFIRM to save, EDIT to change, or CANCEL to remove.`;
}

/**
 * Build a "service window closed" message for when we can't reply with free text.
 * In production you'd use an approved template; here we just log the limitation.
 */
export function outsideWindowWarning(to: string): string {
  return (
    `Cannot send free-form reply to ${to.slice(0, 5)}***: ` +
    "outside the 24-hour customer service window. Use a pre-approved template."
  );
}

