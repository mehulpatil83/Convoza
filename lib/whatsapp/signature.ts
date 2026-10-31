/**
 * Webhook signature verification for WhatsApp Cloud API.
 * Uses HMAC-SHA256 with the app secret, and constant-time comparison.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the X-Hub-Signature-256 header sent by Meta.
 *
 * @param rawBody   The exact raw request body bytes (Buffer or string).
 * @param signature The full header value, e.g. "sha256=abc123...".
 * @param appSecret The WHATSAPP_APP_SECRET value.
 * @returns true if the signature is valid.
 */
export function verifySignature(
  rawBody: Buffer | string,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!signature) return false;

  const [algo, hex] = signature.split("=");
  if (algo !== "sha256" || !hex) return false;

  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(hex, "hex"), Buffer.from(expected, "hex"));
  } catch {
    // Buffer lengths differ → definitely not equal
    return false;
  }
}

/**
 * Verify the hub.verify_token for GET webhook challenge.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyToken(received: string, configured: string): boolean {
  if (!received || !configured) return false;
  try {
    const a = Buffer.from(received);
    const b = Buffer.from(configured);
    if (a.length !== b.length) {
      // Prevent timing oracle: still run timingSafeEqual on equal-length dummy buffers
      timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

