/**
 * Unit tests for the send.ts module.
 * Tests the customer service window and reply formatting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isWithinServiceWindow, formatExtractionReply, sendTextMessage } from "./send";
import { _resetConfigCache } from "./config";

describe("isWithinServiceWindow", () => {
  it("returns true when inbound was just sent", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(isWithinServiceWindow(nowSeconds)).toBe(true);
  });

  it("returns true when inbound was 23 hours ago", () => {
    const ts = Math.floor(Date.now() / 1000) - 23 * 3600;
    expect(isWithinServiceWindow(ts)).toBe(true);
  });

  it("returns false when inbound was 25 hours ago", () => {
    const ts = Math.floor(Date.now() / 1000) - 25 * 3600;
    expect(isWithinServiceWindow(ts)).toBe(false);
  });

  it("returns false for timestamp 0 (epoch)", () => {
    expect(isWithinServiceWindow(0)).toBe(false);
  });
});

describe("formatExtractionReply", () => {
  it("formats an order reply with items", () => {
    const reply = formatExtractionReply({
      intent: "order",
      items: [
        { name: "pen", variant: "blue", quantity: 2, source: "2 blue pens" },
        { name: "notebook", variant: null, quantity: 1, source: "1 notebook" },
      ],
      unclear: false,
      dropped: 0,
      skippedModel: false,
    });
    expect(reply).toContain("Order noted");
    expect(reply).toContain("CONFIRM");
    expect(reply).toContain("blue pen");
    expect(reply).toContain("notebook");
  });

  it("formats a cancel reply", () => {
    const reply = formatExtractionReply({
      intent: "cancel",
      items: [{ name: "pen", variant: "red", quantity: null, source: "red pen" }],
      unclear: false,
      dropped: 0,
      skippedModel: false,
    });
    expect(reply).toContain("Cancelling");
    expect(reply).toContain("red pen");
  });

  it("formats an unclear reply", () => {
    const reply = formatExtractionReply({
      intent: "order",
      items: [],
      unclear: true,
      dropped: 0,
      skippedModel: false,
    });
    expect(reply).toContain("couldn't figure out");
  });

  it("includes dropped item warning", () => {
    const reply = formatExtractionReply({
      intent: "order",
      items: [{ name: "pen", variant: null, quantity: 1, source: "pen" }],
      unclear: false,
      dropped: 2,
      skippedModel: false,
    });
    expect(reply).toContain("2 items");
  });

  it("handles chatter intent", () => {
    const reply = formatExtractionReply({
      intent: "chatter",
      items: [],
      unclear: false,
      dropped: 0,
      skippedModel: true,
    });
    expect(reply).toContain("Convoza");
  });
});

describe("sendTextMessage", () => {
  const REQUIRED_ENV = {
    WHATSAPP_ACCESS_TOKEN: "mock-token",
    WHATSAPP_PHONE_NUMBER_ID: "1000000001",
    WHATSAPP_WABA_ID: "2000000002",
    WHATSAPP_APP_SECRET: "secret",
    WHATSAPP_VERIFY_TOKEN: "verify-token",
    WHATSAPP_GRAPH_API_VERSION: "v21.0",
  };

  beforeEach(() => {
    _resetConfigCache();
    for (const [k, v] of Object.entries(REQUIRED_ENV)) {
      process.env[k] = v;
    }
  });

  afterEach(() => {
    _resetConfigCache();
    vi.restoreAllMocks();
  });

  it("successfully sends an outbound message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: "wamid.outbound123" }],
      }),
    } as unknown as Response);

    const res = await sendTextMessage({
      to: "919876543210",
      text: "Hello from Convoza",
    });

    expect(res.messageId).toBe("wamid.outbound123");
  });

  it("handles WhatsApp outbound API failure with error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: "Recipient phone number not in allowed list", code: 131030 },
      }),
    } as unknown as Response);

    await expect(
      sendTextMessage({
        to: "919876543210",
        text: "Testing failure",
      }),
    ).rejects.toThrow("Recipient phone number not in allowed list");
  });
});


