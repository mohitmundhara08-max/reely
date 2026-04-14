-- ============================================================
--  REELY — Supabase Schema
--  Run this in your Supabase SQL editor
-- ============================================================

-- Users table
create table if not exists public.users (
  id          text primary key,           -- phone number (E.164 format)
  phone       text not null,
  created_at  timestamptz default now()
);

-- Reels table
create table if not exists public.reels (
  id           uuid primary key default gen_random_uuid(),
  user_id      text references public.users(id) on delete cascade,
  reel_url     text not null,
  mode         text not null check (mode in ('summary', 'actions', 'content')),
  output       jsonb not null,
  category     text check (category in ('business', 'content', 'health', 'learning')),
  action_taken boolean default false,
  reminder_at  timestamptz,
  created_at   timestamptz default now()
);

-- Indexes
create index if not exists reels_user_id_idx on public.reels(user_id);
create index if not exists reels_created_at_idx on public.reels(created_at desc);
create index if not exists reels_action_taken_idx on public.reels(action_taken);

-- RLS (Row Level Security) — enable for production
alter table public.users enable row level security;
alter table public.reels enable row level security;

-- For the backend service (uses anon key with bypass via service_role)
-- In production, use service_role key in your backend, not anon key.

-- Weekly digest query (used by /digest endpoint)
-- Find users with pending actions in the last 7 days:
-- select u.id, u.phone, count(r.id) as pending
-- from users u
-- join reels r on r.user_id = u.id
-- where r.action_taken = false
--   and r.created_at >= now() - interval '7 days'
-- group by u.id, u.phone
-- having count(r.id) > 0;
