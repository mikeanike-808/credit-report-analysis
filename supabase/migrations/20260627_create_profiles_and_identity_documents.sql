-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Backs the Account/Profile page. Only stores fields Clerk doesn't already
-- have (first/last name and email come from Clerk's currentUser() directly,
-- not duplicated here) -- dob, phone, and mailing address.

create table if not exists profiles (
  user_id                  text primary key,
  dob                      text,
  phone                    text,
  address                  jsonb not null default '{}', -- { street, city, state, zip }
  onboarding_completed_at  timestamptz,
  updated_at               timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid()::text = user_id);

-- Identity documents: status is set manually (by an admin reviewing it in a
-- later phase) -- there is no OCR/auto-verification in this app, so a
-- freshly-uploaded document always starts 'pending'.
create table if not exists identity_documents (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  doc_type         text not null check (doc_type in ('drivers_license', 'ssn_proof', 'address_proof')),
  storage_path     text not null,
  status           text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  rejection_reason text,
  uploaded_at      timestamptz not null default now(),
  verified_at      timestamptz
);

create index if not exists identity_documents_user_id_idx on identity_documents (user_id);

alter table identity_documents enable row level security;

create policy "Users can view own identity documents"
  on identity_documents for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own identity documents"
  on identity_documents for insert
  with check (auth.uid()::text = user_id);

create policy "Users can delete own identity documents"
  on identity_documents for delete
  using (auth.uid()::text = user_id);

-- Storage bucket for the actual document files. Private (public = false) --
-- every read goes through a server route that checks Clerk auth() first,
-- since (same as every RLS policy in this file) auth.uid() never resolves
-- under Clerk and storage policies can't be the real trust boundary either.
insert into storage.buckets (id, name, public)
values ('identity-docs', 'identity-docs', false)
on conflict (id) do nothing;
