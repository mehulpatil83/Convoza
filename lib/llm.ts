import { GoogleGenAI } from "@google/genai";

/**
 * The only file that talks to Gemma 4.
 * LLM_PROVIDER=gemini (default, cloud, Gemini API) or ollama (local fallback).
 */
export interface LlmRequest {
  system: string;
  user: string;
  jsonSchema: Record<string, unknown>;
}

export class LlmError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "LlmError";
  }
}

export function getProvider(): "gemini" | "ollama" {
  return (process.env.LLM_PROVIDER ?? "gemini").trim().toLowerCase() === "ollama" ? "ollama" : "gemini";
}

export function getModelName(): string {
  return getProvider() === "ollama"
    ? (process.env.OLLAMA_MODEL ?? "gemma4:e4b").trim()
    : (process.env.GEMMA_MODEL ?? "gemma-4-26b-a4b-it").trim().replace(/^["']|["']$/g, "").trim() || "gemma-4-26b-a4b-it";
}

function getApiKey(): string {
  const raw = process.env.GEMINI_API_KEY ?? "";
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function statusOf(e: unknown): number | undefined {
  const s =
    (e as { status?: unknown; statusCode?: unknown; code?: unknown })?.status ??
    (e as { statusCode?: unknown })?.statusCode ??
    (e as { code?: unknown })?.code;
  if (typeof s === "number") return s;
  if (typeof s === "string" && /^\d+$/.test(s)) return parseInt(s, 10);
  return undefined;
}

/** Retry rate limits and transient 5xx errors with backoff. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 600): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const st = statusOf(e);
      const transient = st === 429 || (st !== undefined && st >= 500) || st === undefined;
      if (!transient || i === attempts - 1) break;
      await sleep(baseMs * 2 ** i);
    }
  }
  throw last;
}

let geminiClient: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) throw new LlmError("GEMINI_API_KEY is not set. Add it in your environment variables (.env.local locally or Vercel Environment Variables).", 500);
  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}

async function callGemini(req: LlmRequest): Promise<string> {
  const model = getModelName();
  const base = {
    systemInstruction: req.system,
    temperature: 0.2,
    responseMimeType: "application/json",
    responseJsonSchema: req.jsonSchema,
  };
  const run = (config: Record<string, unknown>) =>
    gemini().models.generateContent({ model, contents: req.user, config: config as never });

  try {
    const res = await withRetry(() => run({ ...base, thinkingConfig: { thinkingLevel: "MINIMAL" } }));
    return res.text ?? "";
  } catch (e) {
    // Some model versions reject thinkingConfig. Try once more without it.
    const st = statusOf(e);
    const msg = e instanceof Error ? e.message : String(e);
    const isBadReq = st === 400 || msg.includes("400") || msg.toLowerCase().includes("thinking") || msg.toLowerCase().includes("invalid");
    if (isBadReq) {
      const res = await withRetry(() => run(base));
      return res.text ?? "";
    }
    throw e;
  }
}

async function callOllama(req: LlmRequest): Promise<string> {
  const host = (process.env.OLLAMA_HOST ?? "http://localhost:11434").replace(/\/$/, "");
  const numCtx = Number(process.env.OLLAMA_NUM_CTX ?? 8192); // Ollama defaults Gemma 4 to a small 4K window
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getModelName(),
      stream: false,
      think: false,
      format: req.jsonSchema,
      options: { temperature: 0.2, num_ctx: numCtx },
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new LlmError(`Ollama returned ${res.status}. ${body.slice(0, 200)}`, res.status), { status: res.status });
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

export async function generateJsonText(req: LlmRequest): Promise<string> {
  try {
    return await withRetry(() => (getProvider() === "ollama" ? callOllama(req) : callGemini(req)));
  } catch (e) {
    if (e instanceof LlmError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new LlmError(`Gemma call failed: ${msg.slice(0, 200)}`, statusOf(e));
  }
}

/** Is the configured provider reachable and set up? Used by /api/health. */
export async function checkProvider(): Promise<{ ok: boolean; provider: string; model: string; detail?: string }> {
  const provider = getProvider();
  const model = getModelName();
  if (provider === "gemini") {
    const key = getApiKey();
    return key
      ? { ok: true, provider, model }
      : { ok: false, provider, model, detail: "GEMINI_API_KEY is not set." };
  }
  try {
    const host = (process.env.OLLAMA_HOST ?? "http://localhost:11434").replace(/\/$/, "");
    const res = await fetch(`${host}/api/tags`);
    if (!res.ok) return { ok: false, provider, model, detail: `Ollama answered ${res.status}.` };
    const data = (await res.json()) as { models?: { name: string }[] };
    const has = (data.models ?? []).some((m) => m.name === model || m.name.startsWith(`${model}:`) || m.name.split(":")[0] === model);
    return has ? { ok: true, provider, model } : { ok: false, provider, model, detail: `Model not pulled. Run: ollama pull ${model}` };
  } catch {
    return { ok: false, provider, model, detail: "Can't reach Ollama. Start it with: ollama serve" };
  }
}
