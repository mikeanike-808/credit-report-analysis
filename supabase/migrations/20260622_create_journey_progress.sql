-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Backs the journey sidebar's 3 sequential goals (Credit Plan -> Payoff Plan
-- -> Grow & Rebuild). current_goal_index is the count of consecutively
-- completed goals from the start -- not an arbitrary set -- so it can never
-- represent an invalid state like "goal 2 done but goal 1 isn't."

create table if not exists journey_progress (
  user_id           text primary key,
  current_goal_index int not null default 0,
  updated_at        timestamptz not null default now()
);

-- Row-level security policies are included for consistency with the other
-- tables in this app, but cannot actually be enforced -- there is no
-- Supabase Auth session bridged from Clerk, so auth.uid() never resolves.
-- The real trust boundary is the Clerk auth() + userId check in each API
-- route (see src/lib/supabase/server.ts for why).
alter table journey_progress enable row level security;

create policy "Users can view own journey progress"
  on journey_progress for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own journey progress"
  on journey_progress for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own journey progress"
  on journey_progress for update
  using (auth.uid()::text = user_id);
