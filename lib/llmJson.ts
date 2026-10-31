import type { ZodType, ZodTypeDef } from "zod";
import { generateJsonText, LlmError, type LlmRequest } from "./llm";

/** Strip code fences and surrounding chatter, keep the outermost JSON object. */
export function cleanJson(text: string): string {
  const t = text.replace(/```(?:json)?/gi, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  return start >= 0 && end > start ? t.slice(start, end + 1) : t;
}

export function parseWith<T>(schema: ZodType<T, ZodTypeDef, unknown>, text: string): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const parsed = schema.safeParse(JSON.parse(cleanJson(text)));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid shape" };
  } catch {
    return { ok: false, error: "Not valid JSON" };
  }
}

/** One model call: clean the JSON, validate with zod, retry once with a nudge. */
export async function callJson<T>(schema: ZodType<T, ZodTypeDef, unknown>, req: LlmRequest): Promise<T> {
  const first = parseWith(schema, await generateJsonText(req));
  if (first.ok) return first.data;
  const second = parseWith(
    schema,
    await generateJsonText({ ...req, user: `${req.user}\n\nYour last answer was invalid (${first.error}). Return only the JSON object.` }),
  );
  if (second.ok) return second.data;
  throw new LlmError(`Gemma returned an invalid answer: ${second.error}`, 502);
}
