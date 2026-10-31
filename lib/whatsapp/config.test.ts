/**
 * Unit tests for the config module.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { _resetConfigCache } from "./config";

describe("getWhatsAppConfig", () => {
  const REQUIRED_VARS = {
    WHATSAPP_ACCESS_TOKEN: "tok",
    WHATSAPP_PHONE_NUMBER_ID: "pid",
    WHATSAPP_WABA_ID: "wid",
    WHATSAPP_APP_SECRET: "sec",
    WHATSAPP_VERIFY_TOKEN: "vtok",
  };

  beforeEach(() => {
    _resetConfigCache();
    for (const [k, v] of Object.entries(REQUIRED_VARS)) {
      process.env[k] = v;
    }
  });

  afterEach(() => {
    _resetConfigCache();
    for (const k of Object.keys(REQUIRED_VARS)) {
      delete process.env[k];
    }
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
  });

  it("returns a valid config when all env vars are set", async () => {
    const { getWhatsAppConfig } = await import("./config");
    const cfg = getWhatsAppConfig();
    expect(cfg.accessToken).toBe("tok");
    expect(cfg.phoneNumberId).toBe("pid");
    expect(cfg.graphApiVersion).toMatch(/^v\d+\.\d+$/);
    expect(cfg.graphBase).toMatch(/^https:\/\/graph\.facebook\.com\/v/);
  });

  it("uses the configured graph API version", async () => {
    process.env.WHATSAPP_GRAPH_API_VERSION = "v20.0";
    const { getWhatsAppConfig } = await import("./config");
    const cfg = getWhatsAppConfig();
    expect(cfg.graphApiVersion).toBe("v20.0");
    expect(cfg.graphBase).toBe("https://graph.facebook.com/v20.0");
  });

  it("throws when a required env var is missing", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const { getWhatsAppConfig } = await import("./config");
    expect(() => getWhatsAppConfig()).toThrow("WHATSAPP_ACCESS_TOKEN");
  });

  it("does not expose secret values in the error message", async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const { getWhatsAppConfig } = await import("./config");
    try {
      getWhatsAppConfig();
    } catch (e) {
      const msg = (e as Error).message;
      // Message should name the missing var but not reveal any actual secret value
      expect(msg).toContain("WHATSAPP_APP_SECRET");
      expect(msg).not.toContain("tok"); // access token value should not appear
    }
  });

  it("returns false from isWhatsAppConfigured when vars are missing", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const { isWhatsAppConfigured } = await import("./config");
    expect(isWhatsAppConfigured()).toBe(false);
  });
});

