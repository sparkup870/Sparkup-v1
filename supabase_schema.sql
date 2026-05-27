-- ============================================================
-- SparkUp – Campus Feed Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Posts table (supports text, poll, event, announcement)
create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  author_name     text not null,
  author_avatar   text,
  content         text not null default '',
  post_type       text not null default 'text'
                    check (post_type in ('text','poll','event','announcement')),
  likes_count     int  not null default 0,
  images          text[],
  tags            text[],

  -- Poll fields
  poll_options    jsonb,          -- [{id, text, votes, voters:[]}]
  poll_anonymous  boolean default false,
  poll_multi      boolean default false,
  poll_expires_at timestamptz,

  -- Event fields
  event_title     text,
  event_date      text,
  event_time      text,
  event_location  text,
  event_cover     text,
  event_rsvp_count int default 0,

  created_at      timestamptz not null default now()
);

-- Post likes
create table if not exists post_likes (
  id       uuid primary key default gen_random_uuid(),
  post_id  uuid references posts(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  unique(post_id, user_id)
);

-- Post comments
create table if not exists post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references posts(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  author_name text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

-- Event RSVPs
create table if not exists event_rsvps (
  id       uuid primary key default gen_random_uuid(),
  post_id  uuid references posts(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  unique(post_id, user_id)
);

-- RPC to safely increment RSVP count
create or replace function increment_rsvp(post_id uuid)
returns void language sql as $$
  update posts set event_rsvp_count = event_rsvp_count + 1 where id = post_id;
$$;

-- Row Level Security
alter table posts         enable row level security;
alter table post_likes    enable row level security;
alter table post_comments enable row level security;
alter table event_rsvps   enable row level security;

-- Policies: anyone authenticated can read; only owner can delete
create policy "posts_select"  on posts         for select using (true);
create policy "posts_insert"  on posts         for insert with check (auth.uid() = user_id);
create policy "posts_delete"  on posts         for delete using (auth.uid() = user_id);
create policy "posts_update"  on posts         for update using (true);

create policy "likes_select"  on post_likes    for select using (true);
create policy "likes_insert"  on post_likes    for insert with check (auth.uid() = user_id);
create policy "likes_delete"  on post_likes    for delete using (auth.uid() = user_id);

create policy "comments_select" on post_comments for select using (true);
create policy "comments_insert" on post_comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on post_comments for delete using (auth.uid() = user_id);

create policy "rsvps_select"  on event_rsvps   for select using (true);
create policy "rsvps_insert"  on event_rsvps   for insert with check (auth.uid() = user_id);
