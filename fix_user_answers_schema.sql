-- ============================================================
-- Fix user_answers schema: question_id integer → uuid
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

-- 1. Drop existing foreign key constraint if any
alter table user_answers
  drop constraint if exists user_answers_question_id_fkey;

-- 2. Drop the unique constraint that includes question_id (re-added below)
alter table user_answers
  drop constraint if exists user_answers_user_id_question_id_key;

-- 3. Drop and recreate question_id as uuid
alter table user_answers
  drop column if exists question_id;

alter table user_answers
  add column question_id uuid references questions(id) on delete cascade;

-- 4. Restore the unique constraint
alter table user_answers
  add constraint user_answers_user_id_question_id_key
  unique (user_id, question_id);

-- 5. Ensure RLS policy exists for inserts (safe to re-run)
do $$ begin
  drop policy if exists "answers_insert" on user_answers;
  drop policy if exists "answers_select" on user_answers;
exception when others then null;
end $$;

alter table user_answers enable row level security;

create policy "answers_select" on user_answers for select using (true);
create policy "answers_insert" on user_answers for insert with check (auth.uid() = user_id);
