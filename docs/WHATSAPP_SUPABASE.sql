-- WhatsApp integration tables for Convoza.
-- Run once in the Supabase SQL editor.

-- ── Idempotency: track every processed WhatsApp message ID ────────────────────

create table if not exists public.whatsapp_processed_messages (
  message_id   text primary key,
  processed_at timestamptz not null default now()
);

-- Auto-prune rows older than 30 days (WhatsApp message IDs are only needed
-- for the deduplication window; Meta's retry window is at most 72 hours).
create index if not exists whatsapp_processed_messages_ts
  on public.whatsapp_processed_messages (processed_at desc);

-- Row-level security: only server-side service key can read/write.
alter table public.whatsapp_processed_messages enable row level security;
-- No RLS policies: anon and authenticated roles get no access.

-- ── Pending confirmations: one row per sender awaiting CONFIRM ────────────────

create table if not exists public.whatsapp_pending_confirmations (
  sender_id      text primary key,
  candidate_json text not null,
  expires_at     timestamptz not null
);

create index if not exists whatsapp_pending_confirmations_expiry
  on public.whatsapp_pending_confirmations (expires_at);

alter table public.whatsapp_pending_confirmations enable row level security;
-- No RLS policies: anon and authenticated roles get no access.

-- ── Cleanup function (optional, run via pg_cron or manually) ──────────────────

-- delete from public.whatsapp_processed_messages
--   where processed_at < now() - interval '30 days';

-- delete from public.whatsapp_pending_confirmations
--   where expires_at < now();

