import { z } from "zod";

export const TAGS = ["stock", "offer", "order_call", "quote_request", "other"] as const;
export const MOD_CATEGORIES = ["ok", "otp_scam", "upi_scam", "advance_payment", "abuse", "spam"] as const;
export type Tag = (typeof TAGS)[number];

export const PostItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  variant: z.string().trim().max(60).nullable().default(null),
  price: z.number().nonnegative().max(10000000).nullable().default(null),
  unit: z.string().trim().max(20).nullable().default(null),
  source: z.string().trim().min(1).max(300),
});

export const PostCheckSchema = z.object({
  tag: z.enum(TAGS),
  summary: z.string().trim().max(200),
  items: z.array(PostItemSchema).max(20).default([]),
  moderation: z.object({
    allowed: z.boolean(),
    category: z.enum(MOD_CATEGORIES).default("ok"),
    reason: z.string().trim().max(200).nullable().default(null),
  }),
});

export type PostItem = z.infer<typeof PostItemSchema>;
export type PostCheck = z.infer<typeof PostCheckSchema>;

export const POST_JSON_SCHEMA = {
  type: "object",
  properties: {
    tag: { type: "string", enum: [...TAGS] },
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          variant: { type: ["string", "null"] },
          price: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          source: { type: "string" },
        },
        required: ["name", "variant", "price", "unit", "source"],
      },
    },
    moderation: {
      type: "object",
      properties: {
        allowed: { type: "boolean" },
        category: { type: "string", enum: [...MOD_CATEGORIES] },
        reason: { type: ["string", "null"] },
      },
      required: ["allowed", "category", "reason"],
    },
  },
  required: ["tag", "summary", "items", "moderation"],
} as const;

export interface Post {
  id: string;
  space: "buyers" | "groups" | "shops";
  author: string;
  role: "consumer" | "community" | "merchant";
  text: string;
  tag: Tag;
  summary: string;
  items: PostItem[];
  createdAt: string;
}
