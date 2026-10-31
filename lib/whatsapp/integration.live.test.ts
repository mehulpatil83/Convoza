/**
 * Opt-in integration tests for live Meta WhatsApp Cloud API and live Google GenAI (Gemma 4).
 *
 * These tests are skipped by default.
 * To execute live Gemma 4 test:
 *   TEST_LIVE_GEMMA=1 GEMINI_API_KEY=your_key npm test lib/whatsapp/integration.live.test.ts
 *
 * To execute live WhatsApp send test:
 *   TEST_LIVE_WHATSAPP=1 WHATSAPP_ACCESS_TOKEN=... npm test lib/whatsapp/integration.live.test.ts
 */

import { describe, it, expect } from "vitest";

const RUN_LIVE_GEMMA = process.env.TEST_LIVE_GEMMA === "1" || process.env.TEST_LIVE_GEMMA === "true";
const RUN_LIVE_WHATSAPP = process.env.TEST_LIVE_WHATSAPP === "1" || process.env.TEST_LIVE_WHATSAPP === "true";

describe.skipIf(!RUN_LIVE_GEMMA)("Live Gemma 4 Extraction (Opt-In)", () => {
  it("extracts items from a realistic Hinglish message using live Gemma 4", async () => {
    const { readMessage } = await import("@/lib/readMessage");
    const outcome = await readMessage("Rahul", "2 blue register aur 3 natraj pencil bhej do");
    expect(outcome.result.intent).toBe("order");
    expect(outcome.result.items.length).toBeGreaterThan(0);
    // Verified against source text
    expect(outcome.dropped).toBe(0);
  }, 30000);
});

describe.skipIf(!RUN_LIVE_WHATSAPP)("Live WhatsApp Cloud API Send (Opt-In)", () => {
  it("sends an outbound message to a verified recipient", async () => {
    const { sendTextMessage } = await import("./send");
    const testRecipient = process.env.TEST_WHATSAPP_RECIPIENT;
    if (!testRecipient) {
      throw new Error("Set TEST_WHATSAPP_RECIPIENT to run live WhatsApp test");
    }
    const res = await sendTextMessage({
      to: testRecipient,
      text: "Convoza integration test ping",
    });
    expect(res.messageId).toBeDefined();
  }, 20000);
});

