-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Backs the notification bell + full Notifications page.

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  type       text not null check (type in ('letter_mailed', 'items_deleted', 'new_report', 'round_ready')),
  title      text not null,
  body       text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- The bell/page always query unread-first, newest-first.
create index if not exists notifications_user_read_created_idx
  on notifications (user_id, read, created_at desc);

alter table notifications enable row level security;

create policy "Users can view own notifications"
  on notifications for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own notifications"
  on notifications for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own notifications"
  on notifications for update
  using (auth.uid()::text = user_id);
