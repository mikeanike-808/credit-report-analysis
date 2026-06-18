-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Adds persistence for the analysis result (so the sidebar work hub survives a
-- refresh now that sign-in is mandatory) and the "Bite" concept -- a dated
-- record grouping all dispute letters sent together in one visit, shown on
-- the History page.

create table if not exists analyses (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  user_info  jsonb not null,   -- UserInfo (name/dob/ssn/address) -- needed to regenerate letters later
  result     jsonb not null,   -- full AnalysisResult
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_id_idx on analyses (user_id);

alter table analyses enable row level security;

create policy "Users can view own analyses"
  on analyses for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own analyses"
  on analyses for insert
  with check (auth.uid()::text = user_id);

create table if not exists bites (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  sent_at       timestamptz not null default now(),
  letter_count  int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists bites_user_id_idx on bites (user_id);

alter table bites enable row level security;

create policy "Users can view own bites"
  on bites for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own bites"
  on bites for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own bites"
  on bites for update
  using (auth.uid()::text = user_id);

alter table disputes add column if not exists bite_id uuid references bites(id);
