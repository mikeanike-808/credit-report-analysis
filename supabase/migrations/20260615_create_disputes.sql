-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Creates the disputes table for DisputeGator tracking system

create table if not exists disputes (
  id                   uuid primary key default gen_random_uuid(),
  user_id              text not null,
  creditor             text not null,
  account_number       text not null,
  bureau_key           text not null check (bureau_key in ('experian','equifax','transunion')),
  dispute_category     text not null,
  send_method          text not null check (send_method in ('auto','manual')),
  sent_at              timestamptz not null,
  lob_letter_id        text,
  lob_tracking_number  text,
  expected_response_by timestamptz not null,
  status               text not null default 'sent' check (status in ('sent','responded','resolved','expired')),
  created_at           timestamptz not null default now()
);

-- Index for fast user lookups
create index if not exists disputes_user_id_idx on disputes (user_id);

-- Row-level security: users can only see/edit their own disputes
alter table disputes enable row level security;

create policy "Users can view own disputes"
  on disputes for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own disputes"
  on disputes for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own disputes"
  on disputes for update
  using (auth.uid()::text = user_id);
