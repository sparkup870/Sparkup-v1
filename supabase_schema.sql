-- ============================================================
-- SparkUp – Campus Feed Schema Migration
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── 1. Ensure posts table exists (for fresh installs) ────────────────────────
create table if not exists posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  author_name  text not null,
  content      text not null default '',
  likes_count  int  not null default 0,
  created_at   timestamptz not null default now()
);

-- ── 2. Add new columns to posts (safe – skips if already present) ────────────
alter table posts add column if not exists author_avatar    text;
alter table posts add column if not exists post_type        text not null default 'text';
alter table posts add column if not exists images           text[];
alter table posts add column if not exists tags             text[];

-- Poll columns
alter table posts add column if not exists poll_options     jsonb;
alter table posts add column if not exists poll_anonymous   boolean default false;
alter table posts add column if not exists poll_multi       boolean default false;
alter table posts add column if not exists poll_expires_at  timestamptz;

-- Event columns
alter table posts add column if not exists event_title      text;
alter table posts add column if not exists event_date       text;
alter table posts add column if not exists event_time       text;
alter table posts add column if not exists event_location   text;
alter table posts add column if not exists event_cover      text;
alter table posts add column if not exists event_rsvp_count int default 0;

-- Add check constraint only if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_post_type_check' and conrelid = 'posts'::regclass
  ) then
    alter table posts add constraint posts_post_type_check
      check (post_type in ('text','poll','event','announcement'));
  end if;
end$$;

-- ── 3. Supporting tables ─────────────────────────────────────────────────────
create table if not exists post_likes (
  id       uuid primary key default gen_random_uuid(),
  post_id  uuid references posts(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  unique(post_id, user_id)
);

create table if not exists post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references posts(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  author_name text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists event_rsvps (
  id       uuid primary key default gen_random_uuid(),
  post_id  uuid references posts(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  unique(post_id, user_id)
);

-- ── 4. RPC to safely increment RSVP count ────────────────────────────────────
create or replace function increment_rsvp(post_id uuid)
returns void language sql as $$
  update posts set event_rsvp_count = event_rsvp_count + 1 where id = post_id;
$$;

-- ── 5. Row Level Security ─────────────────────────────────────────────────────
alter table posts         enable row level security;
alter table post_likes    enable row level security;
alter table post_comments enable row level security;
alter table event_rsvps   enable row level security;

-- Drop and recreate policies so re-runs don't error
do $$ begin
  drop policy if exists "posts_select"    on posts;
  drop policy if exists "posts_insert"    on posts;
  drop policy if exists "posts_delete"    on posts;
  drop policy if exists "posts_update"    on posts;
  drop policy if exists "likes_select"    on post_likes;
  drop policy if exists "likes_insert"    on post_likes;
  drop policy if exists "likes_delete"    on post_likes;
  drop policy if exists "comments_select" on post_comments;
  drop policy if exists "comments_insert" on post_comments;
  drop policy if exists "comments_delete" on post_comments;
  drop policy if exists "rsvps_select"    on event_rsvps;
  drop policy if exists "rsvps_insert"    on event_rsvps;
end $$;

create policy "posts_select"    on posts         for select using (true);
create policy "posts_insert"    on posts         for insert with check (auth.uid() = user_id);
create policy "posts_delete"    on posts         for delete using (auth.uid() = user_id);
create policy "posts_update"    on posts         for update using (true);

create policy "likes_select"    on post_likes    for select using (true);
create policy "likes_insert"    on post_likes    for insert with check (auth.uid() = user_id);
create policy "likes_delete"    on post_likes    for delete using (auth.uid() = user_id);

create policy "comments_select" on post_comments for select using (true);
create policy "comments_insert" on post_comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on post_comments for delete using (auth.uid() = user_id);

create policy "rsvps_select"    on event_rsvps   for select using (true);
create policy "rsvps_insert"    on event_rsvps   for insert with check (auth.uid() = user_id);
