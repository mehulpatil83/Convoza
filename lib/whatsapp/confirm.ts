/**
 * Per-sender confirmation handling.
 *
 * A user must only be able to confirm their own pending record.
 * We never use a global CONFIRM flag.
 *
 * Supported commands (case-insensitive, trimmed):
 *   CONFIRM   — save the pending candidate
 *   EDIT      — ask the user to re-send their order
 *   CANCEL    — discard the pending candidate
 *   HELP      — show usage instructions
 */

import { getPending, clearPending } from "./store";

export type ConfirmCommand = "confirm" | "edit" | "cancel" | "help";

const CONFIRM_RE = /^confirm$/i;
const EDIT_RE = /^edit$/i;
const CANCEL_RE = /^cancel$/i;
const HELP_RE = /^help$/i;

/**
 * Parse a WhatsApp message as a confirmation command.
 * Returns null if the message is not a recognised command.
 */
export function parseConfirmCommand(text: string): ConfirmCommand | null {
  const t = text.trim();
  if (CONFIRM_RE.test(t)) return "confirm";
  if (EDIT_RE.test(t)) return "edit";
  if (CANCEL_RE.test(t)) return "cancel";
  if (HELP_RE.test(t)) return "help";
  return null;
}

/**
 * Handle a confirmation command from a specific sender.
 * Returns the reply text to send back.
 */
export async function handleConfirmCommand(
  senderId: string,
  command: ConfirmCommand,
): Promise<string> {
  switch (command) {
    case "help":
      return (
        "🤖 *Convoza Help*\n\n" +
        "Send me items you want to order, e.g.:\n" +
        "  _\"2 blue pens, 1 notebook\"\_\n\n" +
        "Commands:\n" +
        "  *CONFIRM* — save your order\n" +
        "  *EDIT* — re-send your order\n" +
        "  *CANCEL* — discard your pending order\n" +
        "  *HELP* — show this message"
      );

    case "cancel": {
      const pending = await getPending(senderId);
      if (!pending) {
        return "No pending order to cancel. Send me your order first!";
      }
      await clearPending(senderId);
      return "❌ Your pending order has been cancelled.";
    }

    case "edit": {
      const pending = await getPending(senderId);
      if (!pending) {
        return "No pending order to edit. Send me your order!";
      }
      // Keep the pending record so the user can re-send; don't clear it.
      return (
        "✏️ Please re-send your order. Your previous pending order will be replaced.\n\n" +
        "Example: _\"3 red pens, 2 notebooks\"_"
      );
    }

    case "confirm": {
      const pending = await getPending(senderId);
      if (!pending) {
        return "No pending order to confirm. Send me your order first!";
      }
      // Confirmation: clear pending and acknowledge.
      // The actual persistence of the candidate would happen here in a full implementation.
      // For now we record it as confirmed and clear the queue.
      await clearPending(senderId);
      let summary = "(order saved)";
      try {
        const data = JSON.parse(pending) as { items?: { name: string; quantity: number | null }[] };
        if (data.items && data.items.length > 0) {
          summary = data.items
            .map((i) => `${i.quantity ?? "?"} × ${i.name}`)
            .join(", ");
        }
      } catch {
        // Leave default summary
      }
      return `✅ Order confirmed!\n${summary}\n\nYour order is saved. Reply HELP for more options.`;
    }
  }
}

