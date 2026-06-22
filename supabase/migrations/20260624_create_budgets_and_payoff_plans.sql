-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Backs Budget Builder and the Payoff Plan calculator -- both are one row
-- per user, overwritten in place each time the user edits them (unlike
-- `debts`, which is itself the source of truth these two read from).

create table if not exists budgets (
  user_id    text primary key,
  income     numeric not null default 0,
  categories jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table budgets enable row level security;

create policy "Users can view own budget"
  on budgets for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own budget"
  on budgets for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own budget"
  on budgets for update
  using (auth.uid()::text = user_id);

create table if not exists payoff_plans (
  user_id       text primary key,
  extra_payment numeric not null default 0,
  updated_at    timestamptz not null default now()
);

alter table payoff_plans enable row level security;

create policy "Users can view own payoff plan"
  on payoff_plans for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own payoff plan"
  on payoff_plans for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own payoff plan"
  on payoff_plans for update
  using (auth.uid()::text = user_id);
