/**
 * Tests for the WhatsApp Webhook Route Handlers:
 * GET /api/webhooks/whatsapp
 * POST /api/webhooks/whatsapp
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { GET, POST } from "@/app/api/webhooks/whatsapp/route";
import { _resetConfigCache } from "./config";

const TEST_SECRET = "whatsapp-app-secret-12345";
const TEST_VERIFY_TOKEN = "my-verify-token-xyz";

function signPayload(body: string, secret: string): string {
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

describe("WhatsApp Webhook Route Handlers", () => {
  const ENV = {
    WHATSAPP_ACCESS_TOKEN: "mock-access-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WABA_ID: "0987654321",
    WHATSAPP_APP_SECRET: TEST_SECRET,
    WHATSAPP_VERIFY_TOKEN: TEST_VERIFY_TOKEN,
    WHATSAPP_GRAPH_API_VERSION: "v21.0",
  };

  beforeEach(() => {
    _resetConfigCache();
    for (const [k, v] of Object.entries(ENV)) {
      process.env[k] = v;
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    _resetConfigCache();
    for (const k of Object.keys(ENV)) {
      delete process.env[k];
    }
  });

  describe("GET /api/webhooks/whatsapp — Verification Challenge", () => {
    it("returns the challenge as plain text when verification token is valid", async () => {
      const url = `https://convoza.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=test_challenge_code_1234`;
      const req = new NextRequest(url);

      const res = await GET(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("test_challenge_code_1234");
      expect(res.headers.get("content-type")).toContain("text/plain");
    });

    it("returns 403 Forbidden when verification token does not match", async () => {
      const url = `https://convoza.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge_code_1234`;
      const req = new NextRequest(url);

      const res = await GET(req);
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).toContain("Forbidden");
    });

    it("returns 400 Bad Request when hub.mode is not subscribe", async () => {
      const url = `https://convoza.com/api/webhooks/whatsapp?hub.mode=publish&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=test_challenge`;
      const req = new NextRequest(url);

      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 Bad Request when hub.challenge is missing", async () => {
      const url = `https://convoza.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}`;
      const req = new NextRequest(url);

      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/webhooks/whatsapp — Event Ingestion", () => {
    it("rejects request with 403 when X-Hub-Signature-256 is invalid", async () => {
      const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
      const req = new NextRequest("https://convoza.com/api/webhooks/whatsapp", {
        method: "POST",
        headers: {
          "x-hub-signature-256": "sha256=invalidhexsignature000000000000000000000000000000000000000000000000",
          "content-type": "application/json",
        },
        body,
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).toContain("invalid signature");
    });

    it("accepts request with 200 when X-Hub-Signature-256 is valid", async () => {
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "WABA_ID",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "1234567890",
                    phone_number_id: "1234567890",
                  },
                  statuses: [
                    {
                      id: "wamid.status1",
                      status: "delivered",
                      timestamp: "1730000000",
                      recipient_id: "919876543210",
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
      const body = JSON.stringify(payload);
      const signature = signPayload(body, TEST_SECRET);

      const req = new NextRequest("https://convoza.com/api/webhooks/whatsapp", {
        method: "POST",
        headers: {
          "x-hub-signature-256": signature,
          "content-type": "application/json",
        },
        body,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("EVENT_RECEIVED");
    });
  });
});

