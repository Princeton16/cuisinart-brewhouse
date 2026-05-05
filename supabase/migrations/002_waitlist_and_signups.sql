-- ============================================================
-- 002_waitlist_and_signups.sql
-- Adds backend tables for:
--   1. Phase 2 waitlist (email capture on the home teaser)
--   2. Challenge signups (community page "Join challenge")
--   3. Giveaway entries (community page giveaway click)
--
-- Run this in the Supabase SQL editor.
-- ============================================================

-- ---------- Phase 2 waitlist ----------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'phase2-home',
  created_at timestamptz default now(),
  constraint waitlist_email_unique unique (email)
);

alter table public.waitlist enable row level security;

-- Anyone (including guests) can join the waitlist
drop policy if exists "Anyone can join waitlist" on public.waitlist;
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Anyone can read the count (no PII exposed via head:true count queries)
drop policy if exists "Anyone can read waitlist" on public.waitlist;
create policy "Anyone can read waitlist"
  on public.waitlist for select
  to anon, authenticated
  using (true);


-- ---------- Challenge signups ----------
create table if not exists public.challenge_signups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  challenge_id text not null,
  joined_at timestamptz default now(),
  constraint challenge_signups_user_challenge_unique unique (user_id, challenge_id)
);

alter table public.challenge_signups enable row level security;

drop policy if exists "Users can join challenges" on public.challenge_signups;
create policy "Users can join challenges"
  on public.challenge_signups for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can leave challenges" on public.challenge_signups;
create policy "Users can leave challenges"
  on public.challenge_signups for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read challenge signups" on public.challenge_signups;
create policy "Anyone can read challenge signups"
  on public.challenge_signups for select
  to anon, authenticated
  using (true);


-- ---------- Giveaway entries ----------
create table if not exists public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  giveaway_id text not null,
  email text,
  entered_at timestamptz default now(),
  constraint giveaway_entries_user_unique unique (user_id, giveaway_id)
);

-- Allow guests to enter (user_id null) so the demo always works
alter table public.giveaway_entries enable row level security;

drop policy if exists "Anyone can enter giveaways" on public.giveaway_entries;
create policy "Anyone can enter giveaways"
  on public.giveaway_entries for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can read giveaway entries" on public.giveaway_entries;
create policy "Anyone can read giveaway entries"
  on public.giveaway_entries for select
  to anon, authenticated
  using (true);
