/**
 * Unit tests for the WhatsApp signature verification module.
 * All tests use mocked external services.
 */

import { describe, it, expect } from "vitest";
import { verifySignature, verifyToken } from "./signature";
import { createHmac } from "node:crypto";

function makeSignature(body: string, secret: string): string {
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

describe("verifySignature", () => {
  const SECRET = "test-secret-key";
  const BODY = '{"object":"whatsapp_business_account"}';

  it("accepts a valid X-Hub-Signature-256 header", () => {
    const sig = makeSignature(BODY, SECRET);
    expect(verifySignature(BODY, sig, SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = makeSignature(BODY, SECRET);
    expect(verifySignature(BODY + "x", sig, SECRET)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const sig = makeSignature(BODY, "wrong-secret");
    expect(verifySignature(BODY, sig, SECRET)).toBe(false);
  });

  it("rejects a null signature", () => {
    expect(verifySignature(BODY, null, SECRET)).toBe(false);
  });

  it("rejects a signature without sha256= prefix", () => {
    const hex = createHmac("sha256", SECRET).update(BODY).digest("hex");
    expect(verifySignature(BODY, hex, SECRET)).toBe(false);
  });

  it("rejects a signature with wrong algorithm prefix", () => {
    const hex = createHmac("sha256", SECRET).update(BODY).digest("hex");
    expect(verifySignature(BODY, `sha1=${hex}`, SECRET)).toBe(false);
  });

  it("rejects an empty signature string", () => {
    expect(verifySignature(BODY, "", SECRET)).toBe(false);
  });

  it("works with a Buffer body", () => {
    const body = Buffer.from(BODY);
    const sig = makeSignature(BODY, SECRET);
    expect(verifySignature(body, sig, SECRET)).toBe(true);
  });
});

describe("verifyToken", () => {
  const TOKEN = "my-super-secret-verify-token";

  it("accepts a matching token", () => {
    expect(verifyToken(TOKEN, TOKEN)).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(verifyToken("wrong-token", TOKEN)).toBe(false);
  });

  it("rejects an empty received token", () => {
    expect(verifyToken("", TOKEN)).toBe(false);
  });

  it("rejects an empty configured token", () => {
    expect(verifyToken(TOKEN, "")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(verifyToken(TOKEN.toUpperCase(), TOKEN)).toBe(false);
  });
});

