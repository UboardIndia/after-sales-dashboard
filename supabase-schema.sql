-- =============================================================
-- After Sales Dashboard — Supabase schema (Option B: write layer)
-- Google Sheets stay read-only intake; all dashboard actions live here.
-- Run this once in: Supabase → SQL Editor → New query → paste → Run
-- =============================================================

-- 1) complaint_updates — append-only log of every dashboard action
--    on a complaint. Current state = latest row per (complaint_id, field).
--    Keeps full who/when history for accountability.
create table if not exists complaint_updates (
  id          bigint generated always as identity primary key,
  complaint_id text not null,            -- e.g. 'FY 2026-27::219'  (fiscalYear::sequenceNo)
  field       text not null,             -- 'status' | 'assigned_to' | 'remark' | 'bucket'
  value       text,                      -- the new value
  note        text,                      -- optional free-text note with the change
  updated_by  text not null,             -- team member name (Prachi / Adil / Altab / Asis)
  created_at  timestamptz not null default now()
);

create index if not exists idx_complaint_updates_lookup
  on complaint_updates (complaint_id, field, created_at desc);

-- 2) bot_verifications — Prachi's decision on each bot entry.
--    One decision per Bot ID. (Ready for the bot sheet going live.)
create table if not exists bot_verifications (
  id                   bigint generated always as identity primary key,
  bot_id               text not null unique,   -- the 'Bot ID' column from the bot sheet
  decision             text not null check (decision in ('new', 'linked', 'rejected')),
  linked_complaint_id  text,                   -- set when decision = 'linked'
  note                 text,
  verified_by          text not null,
  created_at           timestamptz not null default now()
);

-- 3) Lock both tables down. The dashboard's server (API routes) uses the
--    service_role key which bypasses RLS; browsers can never touch these
--    tables directly.
alter table complaint_updates  enable row level security;
alter table bot_verifications  enable row level security;
-- (no policies on purpose — anon/authenticated get zero access)
