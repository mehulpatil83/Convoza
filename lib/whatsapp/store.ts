/**
 * WhatsApp idempotency and pending-confirmation store.
 *
 * Uses Supabase when available (durable across restarts), falls back to a
 * bounded in-process LRU otherwise.
 *
 * LIMITATION (documented):
 *   The in-memory fallback is NOT durable. A Vercel cold start or function
 *   restart will lose all seen message IDs, risking duplicate processing.
 *   Always configure Supabase in production.
 *
 * Supabase tables required (see docs/WHATSAPP_SUPABASE.sql):
 *   whatsapp_processed_messages (message_id, processed_at)
 *   whatsapp_pending_confirmations (sender_id, candidate_json, expires_at)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Supabase client (singleton) ───────────────────────────────────────────────

const g = globalThis as unknown as {
  __convozaWaSb?: SupabaseClient | null;
};

function supabase(): SupabaseClient | null {
  if (g.__convozaWaSb !== undefined) return g.__convozaWaSb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  g.__convozaWaSb =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return g.__convozaWaSb;
}

// ── In-memory LRU fallback ────────────────────────────────────────────────────

const MAX_MEMORY = 2000;
const MEMORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

interface MemEntry {
  ts: number;
}

const memSeen = new Map<string, MemEntry>();

function memHasSeen(messageId: string): boolean {
  const entry = memSeen.get(messageId);
  if (!entry) return false;
  if (Date.now() - entry.ts > MEMORY_TTL_MS) {
    memSeen.delete(messageId);
    return false;
  }
  return true;
}

function memMarkSeen(messageId: string): void {
  if (memSeen.size >= MAX_MEMORY) {
    // Evict the oldest entry
    const oldest = [...memSeen.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) memSeen.delete(oldest[0]);
  }
  memSeen.set(messageId, { ts: Date.now() });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if this WhatsApp messageId has already been processed.
 * Safe to call multiple times; only the first returns false.
 */
export async function hasBeenProcessed(messageId: string): Promise<boolean> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb
      .from("whatsapp_processed_messages")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();
    if (error) {
      // On DB error, fall through to memory to avoid dropping messages
      return memHasSeen(messageId);
    }
    return data !== null;
  }
  return memHasSeen(messageId);
}

/**
 * Mark a WhatsApp messageId as processed.
 * Call this BEFORE starting Gemma inference to avoid race conditions.
 */
export async function markProcessed(messageId: string): Promise<void> {
  const sb = supabase();
  if (sb) {
    // Upsert — safe even if called twice (idempotent)
    await sb
      .from("whatsapp_processed_messages")
      .upsert({ message_id: messageId, processed_at: new Date().toISOString() })
      .select();
    // Also mark in memory to avoid extra DB reads
    memMarkSeen(messageId);
    return;
  }
  memMarkSeen(messageId);
}

// ── Pending confirmation store ────────────────────────────────────────────────

const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface PendingConfirmation {
  senderId: string;
  /** The serialised candidate data waiting for user confirmation. */
  candidateJson: string;
  expiresAt: number; // Unix ms
}

const memPending = new Map<string, PendingConfirmation>();

export async function setPending(
  senderId: string,
  candidateJson: string,
): Promise<void> {
  const expiresAt = Date.now() + PENDING_TTL_MS;
  const sb = supabase();
  if (sb) {
    await sb
      .from("whatsapp_pending_confirmations")
      .upsert({
        sender_id: senderId,
        candidate_json: candidateJson,
        expires_at: new Date(expiresAt).toISOString(),
      })
      .select();
    return;
  }
  memPending.set(senderId, { senderId, candidateJson, expiresAt });
}

export async function getPending(
  senderId: string,
): Promise<string | null> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb
      .from("whatsapp_pending_confirmations")
      .select("candidate_json, expires_at")
      .eq("sender_id", senderId)
      .maybeSingle();
    if (error || !data) return null;
    // Check expiry
    if (new Date(data.expires_at).getTime() < Date.now()) {
      await clearPending(senderId);
      return null;
    }
    return data.candidate_json;
  }
  const entry = memPending.get(senderId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memPending.delete(senderId);
    return null;
  }
  return entry.candidateJson;
}

export async function clearPending(senderId: string): Promise<void> {
  const sb = supabase();
  if (sb) {
    await sb
      .from("whatsapp_pending_confirmations")
      .delete()
      .eq("sender_id", senderId);
    return;
  }
  memPending.delete(senderId);
}

/** Storage kind for diagnostics. */
export function storeKind(): "supabase" | "memory" {
  return supabase() ? "supabase" : "memory";
}

