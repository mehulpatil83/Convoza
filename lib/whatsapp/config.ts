/**
 * WhatsApp Cloud API configuration — server-side only.
 * Never export raw secret values. Never include in client bundles.
 */

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  appSecret: string;
  verifyToken: string;
  graphApiVersion: string;
  /** Base URL for the Graph API, e.g. https://graph.facebook.com/v21.0 */
  graphBase: string;
}

class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

let _config: WhatsAppConfig | null = null;

/**
 * Load and validate WhatsApp config from environment variables.
 * Throws a ConfigError (without exposing secret values) if required vars are missing.
 */
export function getWhatsAppConfig(): WhatsAppConfig {
  if (_config) return _config;

  const required: Record<string, string | undefined> = {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_WABA_ID: process.env.WHATSAPP_WABA_ID,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v?.trim())
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new ConfigError(
      `WhatsApp integration is not configured. Missing environment variables: ${missing.join(", ")}. ` +
        "Add them to .env.local (dev) or your Vercel project settings (prod).",
    );
  }

  const version =
    (process.env.WHATSAPP_GRAPH_API_VERSION ?? "v21.0").replace(/^(?!v)/, "v");

  _config = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    wabaId: process.env.WHATSAPP_WABA_ID!,
    appSecret: process.env.WHATSAPP_APP_SECRET!,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
    graphApiVersion: version,
    graphBase: `https://graph.facebook.com/${version}`,
  };

  return _config;
}

/** Whether WhatsApp integration is fully configured. */
export function isWhatsAppConfigured(): boolean {
  try {
    getWhatsAppConfig();
    return true;
  } catch {
    return false;
  }
}

/** Reset cached config (for tests). */
export function _resetConfigCache(): void {
  _config = null;
}

