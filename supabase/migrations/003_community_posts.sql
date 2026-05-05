-- ============================================================
-- 003_community_posts.sql
-- Adds the posts table for the community feed composer.
--
-- Run this in the Supabase SQL editor (paste into a new tab).
-- ============================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author_name text,
  author_handle text,
  text text not null,
  kind text default 'tip',
  created_at timestamptz default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

-- Anyone can post (the demo allows guest authors)
drop policy if exists "Anyone can post" on public.posts;
create policy "Anyone can post"
  on public.posts for insert
  to anon, authenticated
  with check (true);

-- Anyone can read the feed
drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
  on public.posts for select
  to anon, authenticated
  using (true);

-- Authors can delete their own posts
drop policy if exists "Authors can delete own posts" on public.posts;
create policy "Authors can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);
