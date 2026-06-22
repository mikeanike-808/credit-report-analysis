-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Backs the Grow & Rebuild journey goal -- checklist progress for its
-- "Maintain Your Credit" and "Grow Your Credit" tabs. The "Grow Your Money"
-- tab is informational only in the source design (no per-step completion),
-- so it has no array here.

create table if not exists grow_progress (
  user_id    text primary key,
  completed  jsonb not null default '{"maintain":[],"grow":[]}',
  updated_at timestamptz not null default now()
);

alter table grow_progress enable row level security;

create policy "Users can view own grow progress"
  on grow_progress for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own grow progress"
  on grow_progress for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own grow progress"
  on grow_progress for update
  using (auth.uid()::text = user_id);
