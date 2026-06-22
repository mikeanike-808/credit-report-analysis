-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Backs Set It Up (autopilot checklist) and Make It Official (the pledge) --
-- the last two steps of the Payoff Plan stepper, and what completes the
-- Payoff Plan journey goal.

create table if not exists setup_checklist (
  user_id             text primary key,
  completed_steps     int[] not null default '{}',
  nudge_email_enabled  boolean not null default true,
  updated_at          timestamptz not null default now()
);

alter table setup_checklist enable row level security;

create policy "Users can view own setup checklist"
  on setup_checklist for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own setup checklist"
  on setup_checklist for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own setup checklist"
  on setup_checklist for update
  using (auth.uid()::text = user_id);

create table if not exists payoff_pledges (
  user_id          text primary key,
  vision_text      text not null default '',
  plan_text        text not null default '',
  importance       int not null default 0,
  pledge_name      text not null default '',
  pledge_signed_at timestamptz,
  updated_at       timestamptz not null default now()
);

alter table payoff_pledges enable row level security;

create policy "Users can view own pledge"
  on payoff_pledges for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own pledge"
  on payoff_pledges for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own pledge"
  on payoff_pledges for update
  using (auth.uid()::text = user_id);
