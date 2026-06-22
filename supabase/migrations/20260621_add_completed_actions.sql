-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Retroactive migration file -- this column was already added manually via
-- the SQL editor when Action Tracker shipped; this file documents it so the
-- migrations folder matches the live schema.

alter table analyses add column if not exists completed_actions integer[] not null default '{}';
