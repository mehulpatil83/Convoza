/**
 * WhatsApp message processor.
 *
 * Passes inbound messages through the existing Convoza Unified Intelligence
 * Engine (readMessage → guardRead) and produces a reply.
 * Gemma 4 is the only model. No logic is duplicated.
 *
 * IMPORTANT: This module must never write to the database, execute payments,
 * or call WhatsApp APIs directly. It only returns reply text and candidates.
 */

import { readMessage } from "@/lib/readMessage";
import type { InboundTextEvent } from "./parse";
import {
  getPending,
  setPending,
  hasBeenProcessed,
  markProcessed,
} from "./store";
import { parseConfirmCommand, handleConfirmCommand } from "./confirm";
import { formatExtractionReply, isWithinServiceWindow } from "./send";

export interface ProcessResult {
  replyText: string | null;
  /**
   * If null, no reply should be sent (e.g. status event, outside window).
   * If a string, send it back to the sender.
   */
  skip: boolean;
  reason?: string;
}

/**
 * Process one inbound WhatsApp text message through the UIE.
 * Returns the reply text to send (or null to skip).
 *
 * This function:
 *  1. Checks idempotency (returns skip if already seen).
 *  2. Checks whether it's a confirmation command (CONFIRM/EDIT/CANCEL/HELP).
 *  3. Otherwise passes to the existing readMessage() pipeline.
 *  4. Stores extracted items as pending confirmation for this sender.
 *  5. Returns a formatted reply.
 */
export async function processInboundMessage(
  event: InboundTextEvent,
): Promise<ProcessResult> {
  // ── 1. Idempotency check ────────────────────────────────────────────────────
  if (await hasBeenProcessed(event.messageId)) {
    return { replyText: null, skip: true, reason: "duplicate" };
  }

  // Mark processed BEFORE inference to prevent races on retried webhooks
  await markProcessed(event.messageId);

  // ── 2. Customer service window check ───────────────────────────────────────
  if (!isWithinServiceWindow(event.timestamp)) {
    // Outside the 24-hour window — cannot send free-form reply.
    // Log internally (no private content), do not send.
    console.warn(
      `[whatsapp] Outside service window for sender ${event.from.slice(0, 5)}***`,
    );
    return {
      replyText: null,
      skip: true,
      reason: "outside_service_window",
    };
  }

  const text = event.text.trim();

  // ── 3. Confirmation command handling ───────────────────────────────────────
  const command = parseConfirmCommand(text);
  if (command) {
    const reply = await handleConfirmCommand(event.from, command);
    return { replyText: reply, skip: false };
  }

  // ── 4. Inject prompt guard against prompt injection ────────────────────────
  // Sanitise the text: we wrap it so the model sees it as user content,
  // not as system instructions. The existing prompt already does this via
  // readUser(sender, text) but we add an explicit guard.
  const sanitisedText = sanitiseInput(text);

  // ── 5. Pass through the existing UIE ───────────────────────────────────────
  const outcome = await readMessage(event.from, sanitisedText);
  const { result, dropped, skippedModel } = outcome;

  // ── 6. Store pending confirmation if items were found ──────────────────────
  if (result.intent === "order" && result.items.length > 0) {
    const candidateJson = JSON.stringify({
      items: result.items,
      from: event.from,
      messageId: event.messageId,
      timestamp: event.timestamp,
    });
    // Store under this sender only — a user can never confirm another's record
    await setPending(event.from, candidateJson);
  } else if (result.intent === "cancel" && result.items.length > 0) {
    // Cancel command: clear any pending confirmation for this sender
    await setPending(event.from, JSON.stringify({
      items: result.items,
      intent: "cancel",
      from: event.from,
      messageId: event.messageId,
      timestamp: event.timestamp,
    }));
  }

  // ── 7. Format reply ─────────────────────────────────────────────────────────
  const replyText = formatExtractionReply({
    intent: result.intent,
    items: result.items,
    unclear: result.unclear,
    dropped,
    skippedModel,
  });

  return { replyText, skip: false };
}

/**
 * Guard against prompt injection.
 * Strips common injection patterns. The existing UIE prompt already wraps
 * content as user data, but belt-and-suspenders here.
 */
function sanitiseInput(text: string): string {
  return (
    text
      // Remove null bytes
      .replace(/\x00/g, "")
      // Collapse obvious role-injection attempts
      .replace(/^\s*(system:|assistant:|<\|im_start\|>|<\|im_end\|>)/gim, "[BLOCKED] ")
      // Limit length to what the schema allows
      .slice(0, 1000)
      .trim()
  );
}

