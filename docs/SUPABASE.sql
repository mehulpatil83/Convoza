-- Run once in the Supabase SQL editor to persist Crowdmind posts.
create table if not exists public.crowdmind_posts (
  id uuid primary key default gen_random_uuid(),
  space text not null check (space in ('buyers','groups','shops')),
  author text not null,
  role text not null check (role in ('consumer','community','merchant')),
  text text not null,
  tag text not null,
  summary text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crowdmind_posts_space_created on public.crowdmind_posts (space, created_at desc);

-- Row-level security: the browser never talks to this table. Only the server (secret key) reads and writes.
alter table public.crowdmind_posts enable row level security;
-- No policies on purpose: anon and authenticated roles get no access.
