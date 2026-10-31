/**
 * GET /api/webhooks/whatsapp
 * Handles Meta's webhook verification challenge.
 *
 * POST /api/webhooks/whatsapp
 * Receives incoming WhatsApp messages and status updates.
 * Verifies X-Hub-Signature-256 before processing.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp/config";
import { verifySignature, verifyToken } from "@/lib/whatsapp/signature";
import { parseWebhookPayload, isOutgoingEcho } from "@/lib/whatsapp/parse";
import { processInboundMessage } from "@/lib/whatsapp/processor";
import { sendTextMessage, markRead } from "@/lib/whatsapp/send";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── GET — webhook verification ────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  if (!isWhatsAppConfigured()) {
    return new Response("WhatsApp integration not configured.", { status: 503 });
  }

  const cfg = getWhatsAppConfig();
  const sp = request.nextUrl.searchParams;

  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode !== "subscribe") {
    return new Response("Invalid hub.mode.", { status: 400 });
  }

  if (!verifyToken(token ?? "", cfg.verifyToken)) {
    return new Response("Forbidden — verify token mismatch.", { status: 403 });
  }

  if (!challenge) {
    return new Response("Missing hub.challenge.", { status: 400 });
  }

  // Return challenge as plain text — Meta requires exactly this.
  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// ── POST — receive messages ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  if (!isWhatsAppConfigured()) {
    // Acknowledge to Meta even when unconfigured so it doesn't retry indefinitely
    return new Response("OK", { status: 200 });
  }

  // Rate-limit by IP to prevent abuse
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!allow(`wa-webhook:${ip}`, 300)) {
    // Still return 200 to Meta; we just won't process it
    return new Response("OK", { status: 200 });
  }

  // Read the raw body for HMAC verification BEFORE any parsing
  const rawBody = await request.arrayBuffer();
  const bodyBuffer = Buffer.from(rawBody);

  const cfg = getWhatsAppConfig();

  // Verify X-Hub-Signature-256
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifySignature(bodyBuffer, signature, cfg.appSecret)) {
    // Do NOT log the signature value — it could leak timing info
    return new Response("Forbidden — invalid signature.", { status: 403 });
  }

  // Parse body as JSON
  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(bodyBuffer.toString("utf-8"));
  } catch {
    return new Response("Bad Request — invalid JSON.", { status: 400 });
  }

  // Parse into typed events (unknown event shapes are safely ignored)
  const events = parseWebhookPayload(rawPayload);

  // Acknowledge Meta immediately — we process below but must return quickly.
  // Meta expects a 200 within ~20 seconds.
  // We return the response object and then do processing synchronously.
  // This is the limitation of Vercel without a job queue:
  // we must fit within maxDuration (60s).
  const response = new Response("EVENT_RECEIVED", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });

  // Process events (synchronous within this function's lifetime)
  await processEvents(events, cfg.phoneNumberId);

  return response;
}

// ── Event processor ───────────────────────────────────────────────────────────

async function processEvents(
  events: ReturnType<typeof parseWebhookPayload>,
  ownPhoneNumberId: string,
): Promise<void> {
  for (const event of events) {
    if (event.kind === "status") {
      // Delivery/read receipts — log minimally, no user data
      console.log(`[whatsapp] Status ${event.status} for msg ${event.messageId.slice(0, 8)}***`);
      continue;
    }

    if (event.kind === "unsupported") {
      // Could send a "sorry, text only" reply, but to avoid noise we skip silently
      console.log(`[whatsapp] Unsupported message type: ${event.messageType}`);
      continue;
    }

    // event.kind === "text"

    // Ignore outgoing echoes (messages we sent that Meta bounces back)
    if (isOutgoingEcho(event, ownPhoneNumberId)) {
      continue;
    }

    try {
      const result = await processInboundMessage(event);

      if (result.skip) {
        // duplicate, outside window, etc.
        continue;
      }

      if (result.replyText) {
        // Mark message as read (best-effort)
        await markRead(event.messageId);

        // Send the reply
        await sendTextMessage({
          to: event.from,
          text: result.replyText,
          replyToMessageId: event.messageId,
        });
      }
    } catch (err) {
      // Log error without private content
      const msg = err instanceof Error ? err.message : "unknown error";
      console.error(`[whatsapp] Processing error: ${msg}`);
      // Do not rethrow — we still return 200 to Meta so it stops retrying
      // the webhook. The message is lost but we avoid an infinite retry loop.
    }
  }
}

