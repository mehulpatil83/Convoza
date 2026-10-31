/**
 * WhatsApp Cloud API webhook payload types and parser.
 * Safely extracts inbound messages from Meta webhook events.
 */

import { z } from "zod";

// ── Zod schemas for the WhatsApp webhook payload ──────────────────────────────

const TextMessageSchema = z.object({
  type: z.literal("text"),
  text: z.object({ body: z.string().min(1).max(4096) }),
});

const GenericMessageSchema = z.object({
  type: z.string(),
});

const InboundMessageSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1), // sender WhatsApp ID (phone number)
  timestamp: z.string().min(1), // Unix epoch string
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
});

const StatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string().min(1),
  recipient_id: z.string().min(1),
});

const ValueSchema = z.object({
  messaging_product: z.literal("whatsapp"),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  messages: z.array(InboundMessageSchema).optional(),
  statuses: z.array(StatusSchema).optional(),
});

const ChangeSchema = z.object({
  value: ValueSchema,
  field: z.literal("messages"),
});

const EntrySchema = z.object({
  id: z.string(),
  changes: z.array(ChangeSchema),
});

export const WebhookPayloadSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(EntrySchema),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type InboundMessage = z.infer<typeof InboundMessageSchema>;
export type MessageStatus = z.infer<typeof StatusSchema>;

// ── Parsed event types ────────────────────────────────────────────────────────

export interface InboundTextEvent {
  kind: "text";
  messageId: string;
  from: string; // sender WhatsApp ID
  timestamp: number; // Unix epoch seconds
  text: string;
  phoneNumberId: string; // which business number received it
}

export interface StatusEvent {
  kind: "status";
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipientId: string;
  timestamp: number;
}

export interface UnsupportedEvent {
  kind: "unsupported";
  messageType: string;
  messageId: string;
  from: string;
}

export type ParsedEvent = InboundTextEvent | StatusEvent | UnsupportedEvent;

/**
 * Parse a raw WhatsApp webhook payload into typed events.
 * Returns an empty array for unknown event shapes (safe degradation).
 */
export function parseWebhookPayload(raw: unknown): ParsedEvent[] {
  const parsed = WebhookPayloadSchema.safeParse(raw);
  if (!parsed.success) return [];

  const events: ParsedEvent[] = [];

  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      const { value } = change;
      const phoneNumberId = value.metadata.phone_number_id;

      // Delivery/read status events — process separately, never treat as messages
      if (value.statuses) {
        for (const s of value.statuses) {
          events.push({
            kind: "status",
            messageId: s.id,
            status: s.status,
            recipientId: s.recipient_id,
            timestamp: parseInt(s.timestamp, 10),
          });
        }
      }

      // Inbound messages
      if (value.messages) {
        for (const msg of value.messages) {
          if (msg.type === "text" && msg.text?.body) {
            events.push({
              kind: "text",
              messageId: msg.id,
              from: msg.from,
              timestamp: parseInt(msg.timestamp, 10),
              text: msg.text.body,
              phoneNumberId,
            });
          } else {
            // Unsupported message type (image, audio, sticker, etc.)
            events.push({
              kind: "unsupported",
              messageType: msg.type,
              messageId: msg.id,
              from: msg.from,
            });
          }
        }
      }
    }
  }

  return events;
}

/**
 * Check if a message was sent by the business number itself (outgoing echo).
 * Meta sometimes delivers outgoing messages back as webhook events.
 * We check: the sender is a phone_number_id (numeric only, long), not a regular WA user ID.
 * A more reliable check: use the "system" message property or context.
 */
export function isOutgoingEcho(event: InboundTextEvent, ownPhoneNumberId: string): boolean {
  // Meta sends outgoing messages with "from" equal to the business phone number ID
  return event.from === ownPhoneNumberId;
}

