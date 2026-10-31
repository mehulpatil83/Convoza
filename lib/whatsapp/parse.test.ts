/**
 * Unit tests for the WhatsApp payload parser.
 */

import { describe, it, expect } from "vitest";
import { parseWebhookPayload, isOutgoingEcho } from "./parse";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTextPayload(overrides: Record<string, unknown> = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "ENTRY_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "1234567890",
                phone_number_id: "PHONE_NUMBER_ID",
              },
              messages: [
                {
                  id: "wamid.test123",
                  from: "919876543210",
                  timestamp: "1730000000",
                  type: "text",
                  text: { body: "2 blue pens please" },
                  ...overrides,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function makeStatusPayload() {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "ENTRY_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "1234567890",
                phone_number_id: "PHONE_NUMBER_ID",
              },
              statuses: [
                {
                  id: "wamid.sent123",
                  status: "delivered",
                  timestamp: "1730000100",
                  recipient_id: "919876543210",
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("parseWebhookPayload — text messages", () => {
  it("parses an incoming text message", () => {
    const events = parseWebhookPayload(makeTextPayload());
    expect(events).toHaveLength(1);
    const evt = events[0];
    expect(evt.kind).toBe("text");
    if (evt.kind === "text") {
      expect(evt.messageId).toBe("wamid.test123");
      expect(evt.from).toBe("919876543210");
      expect(evt.text).toBe("2 blue pens please");
      expect(evt.timestamp).toBe(1730000000);
      expect(evt.phoneNumberId).toBe("PHONE_NUMBER_ID");
    }
  });

  it("returns empty array for non-whatsapp_business_account objects", () => {
    const payload = { object: "page", entry: [] };
    expect(parseWebhookPayload(payload)).toHaveLength(0);
  });

  it("returns empty array for totally invalid payloads", () => {
    expect(parseWebhookPayload(null)).toHaveLength(0);
    expect(parseWebhookPayload("bad")).toHaveLength(0);
    expect(parseWebhookPayload({})).toHaveLength(0);
  });

  it("classifies unsupported message types", () => {
    const events = parseWebhookPayload(
      makeTextPayload({ type: "image", text: undefined }),
    );
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("unsupported");
    if (events[0].kind === "unsupported") {
      expect(events[0].messageType).toBe("image");
    }
  });
});

describe("parseWebhookPayload — status events", () => {
  it("parses a delivery status event", () => {
    const events = parseWebhookPayload(makeStatusPayload());
    expect(events).toHaveLength(1);
    const evt = events[0];
    expect(evt.kind).toBe("status");
    if (evt.kind === "status") {
      expect(evt.status).toBe("delivered");
      expect(evt.messageId).toBe("wamid.sent123");
      expect(evt.recipientId).toBe("919876543210");
    }
  });

  it("does not parse status events as messages", () => {
    const events = parseWebhookPayload(makeStatusPayload());
    expect(events.every((e) => e.kind === "status")).toBe(true);
  });
});

describe("isOutgoingEcho", () => {
  it("detects an echo when from matches phoneNumberId", () => {
    const event = {
      kind: "text" as const,
      messageId: "x",
      from: "PHONE_NUMBER_ID",
      timestamp: 0,
      text: "hello",
      phoneNumberId: "PHONE_NUMBER_ID",
    };
    expect(isOutgoingEcho(event, "PHONE_NUMBER_ID")).toBe(true);
  });

  it("does not flag normal inbound messages as echoes", () => {
    const event = {
      kind: "text" as const,
      messageId: "x",
      from: "919876543210",
      timestamp: 0,
      text: "hello",
      phoneNumberId: "PHONE_NUMBER_ID",
    };
    expect(isOutgoingEcho(event, "PHONE_NUMBER_ID")).toBe(false);
  });
});

