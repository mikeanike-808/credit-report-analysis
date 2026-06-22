-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Backs the Payoff Plan intake wizard (Wake Up Call). One row per debt the
-- user is paying off -- some sourced from their credit report, some entered
-- manually for accounts that don't appear on it.

create table if not exists debts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,
  name               text not null,
  balance            numeric not null,
  apr                numeric not null default 0,
  min_payment        numeric not null default 0,
  source             text not null default 'manual' check (source in ('report', 'manual')),
  -- Links a report-sourced debt back to the negativeItem it was derived from
  -- (creditor + accountNumber), so re-running the wizard can recognize it's
  -- the same debt rather than creating a duplicate.
  report_account_ref text,
  status             text not null default 'active' check (status in ('active', 'paid_off')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists debts_user_id_idx on debts (user_id);

-- Row-level security included for consistency; cannot actually be enforced
-- since there's no Supabase Auth session bridged from Clerk here either --
-- see src/lib/supabase/server.ts for why the real trust boundary is the
-- Clerk auth() + userId check in each API route.
alter table debts enable row level security;

create policy "Users can view own debts"
  on debts for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own debts"
  on debts for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own debts"
  on debts for update
  using (auth.uid()::text = user_id);

create policy "Users can delete own debts"
  on debts for delete
  using (auth.uid()::text = user_id);
