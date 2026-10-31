import { z } from "zod";

/** Gemma job 1: what one chat message means. */
export const ReadItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  variant: z.string().trim().max(60).nullable().default(null),
  quantity: z.number().int().positive().max(100000).nullable().default(null),
  source: z.string().trim().min(1).max(300),
});

export const ReadResultSchema = z.object({
  intent: z.enum(["order", "cancel", "chatter"]),
  items: z.array(ReadItemSchema).max(20).default([]),
  unclear: z.boolean().default(false),
});

export type ReadItem = z.infer<typeof ReadItemSchema>;
export type ReadResult = z.infer<typeof ReadResultSchema>;

/** JSON schema sent to the model so it returns the same shape. */
export const READ_JSON_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["order", "cancel", "chatter"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          variant: { type: ["string", "null"] },
          quantity: { type: ["integer", "null"] },
          source: { type: "string" },
        },
        required: ["name", "variant", "quantity", "source"],
      },
    },
    unclear: { type: "boolean" },
  },
  required: ["intent", "items", "unclear"],
} as const;

export const ChatMessageSchema = z.object({
  sender: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(1000),
});
