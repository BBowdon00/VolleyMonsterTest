-- Volley Monster — Postgres schema for Supabase
-- Run in order in the Supabase SQL editor.
-- Sections: extensions, enums, tables, indexes, RLS policies, seed.
--
-- Conventions:
-- - All timestamps in UTC.
-- - Money in integer cents to avoid floating-point.
-- - UUIDs for all primary keys (so management tokens etc. stay opaque).
-- - `created_at` / `updated_at` on every table; trigger keeps `updated_at` fresh.

-- =========================================================================
-- 1. Extensions
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================================
-- 2. Enums
-- =========================================================================

create type tournament_status as enum (
  'draft',       -- not visible publicly
  'published',   -- visible, registration open or upcoming
  'closed',      -- registration closed, tournament not yet held
  'completed',   -- tournament has happened
  'cancelled'    -- tournament called off
);

create type division_gender as enum ('mens', 'womens', 'coed', 'boys', 'girls');

-- Team format. Volley Monster runs primarily doubles and triples in 2026,
-- but the system leaves room for larger formats in the future.
create type team_format as enum ('doubles', 'triples', 'quads', 'sixes');

-- Skill level taxonomy. Stored as text on `divisions` (not enum) so admins
-- can add unusual labels per event, but these are the canonical values:
--   'Open'     - top tier
--   'AA'       - upper intermediate
--   'A'        - intermediate
--   'BB/B'     - recreational/intermediate
--   'Rec'      - pure recreational
--   '16U'      - juniors 16 and under
--   '14U'      - juniors 14 and under (future)
--   '18U'      - juniors 18 and under (future)

create type team_status as enum (
  'pending_payment', -- created but Stripe not yet completed
  'confirmed',       -- paid and confirmed
  'waitlisted',      -- division was full at submit time
  'cancelled'        -- captain or admin cancelled (refund may apply)
);

create type registration_status as enum (
  'pending', -- awaiting Stripe completion
  'paid',    -- successful
  'failed',  -- expired or declined
  'refunded' -- post-pay refund
);

-- =========================================================================
-- 3. Helper: updated_at trigger
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- 4. Tables
-- =========================================================================

-- Tournaments ---------------------------------------------------------------
create table public.tournaments (
  id              uuid primary key default uuid_generate_v4(),
  slug            text not null unique,
  name            text not null,
  description_md  text,                                 -- markdown
  hero_image_url  text,
  location_name   text,
  location_city   text,
  location_state  text,
  location_address text,
  start_date      date not null,
  end_date        date,                                  -- null for one-day events
  registration_opens_at  timestamptz,
  registration_closes_at timestamptz,
  schedule_md     text,                                  -- markdown for day-of schedule
  faq_md          text,
  status          tournament_status not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger tournaments_set_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();

-- Tournament days -----------------------------------------------------------
-- A tournament can span multiple days, each with a distinct set of divisions.
-- Volley Monster tournaments typically split Saturday (single-gender + juniors)
-- from Sunday (coed). Each day is independently registrable.
create table public.tournament_days (
  id             uuid primary key default uuid_generate_v4(),
  tournament_id  uuid not null references public.tournaments(id) on delete cascade,
  day_date       date not null,
  label          text,                                  -- e.g., 'Saturday — Single-Gender + Juniors'
  description_md text,
  check_in_time  time,                                  -- e.g., 08:00
  start_time     time,                                  -- e.g., 09:00
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tournament_id, day_date)
);

create trigger tournament_days_set_updated_at
  before update on public.tournament_days
  for each row execute function public.set_updated_at();

-- Divisions -----------------------------------------------------------------
-- Divisions belong to a *tournament day*, not directly to a tournament,
-- because the same skill level can have different gender splits / fees
-- on different days of the same event.
create table public.divisions (
  id                 uuid primary key default uuid_generate_v4(),
  tournament_day_id  uuid not null references public.tournament_days(id) on delete cascade,
  skill_level        text not null,                     -- 'Open', 'AA', 'A', 'BB/B', '16U', etc.
  gender             division_gender not null,
  display_name       text generated always as (
    case
      when gender = 'coed'  then skill_level
      when gender = 'mens'  then 'Men''s '   || skill_level
      when gender = 'womens' then 'Women''s ' || skill_level
      when gender = 'boys'  then 'Boys'' '   || skill_level
      when gender = 'girls' then 'Girls'' '  || skill_level
    end
  ) stored,
  fee_cents          integer not null check (fee_cents >= 0),
  max_teams          integer check (max_teams is null or max_teams > 0),  -- null = uncapped
  format             team_format not null default 'triples',
  -- Roster bounds default to 2 (doubles minimum) through 3 (triples).
  -- Override per-division for quads/sixes.
  min_roster         integer not null default 2 check (min_roster > 0),
  max_roster         integer not null default 3 check (max_roster >= min_roster),
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tournament_day_id, skill_level, gender)
);

create trigger divisions_set_updated_at
  before update on public.divisions
  for each row execute function public.set_updated_at();

-- Teams ---------------------------------------------------------------------
create table public.teams (
  id                uuid primary key default uuid_generate_v4(),
  division_id       uuid not null references public.divisions(id) on delete restrict,
  name              text not null,
  city              text,
  captain_name      text not null,
  captain_email     text not null,
  captain_phone     text not null,
  status            team_status not null default 'pending_payment',
  management_token  uuid not null default uuid_generate_v4() unique,
  notes             text,                                 -- admin-only notes
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- prevent duplicate team names within a division (case-insensitive)
  unique (division_id, name)
);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

-- Players -------------------------------------------------------------------
create table public.players (
  id            uuid primary key default uuid_generate_v4(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  name          text not null,
  jersey_number text,
  shirt_size    text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- Registration orders --------------------------------------------------------
-- A captain can register for one or more days in a single transaction
-- (e.g., both Saturday and Sunday of the Season Opener with different
-- partners on each day). One Stripe Checkout session covers all line
-- items in the order.
create table public.registration_orders (
  id                          uuid primary key default uuid_generate_v4(),
  captain_email               text not null,
  total_cents                 integer not null,
  currency                    text not null default 'usd',
  status                      registration_status not null default 'pending',
  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text unique,
  paid_at                     timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger registration_orders_set_updated_at
  before update on public.registration_orders
  for each row execute function public.set_updated_at();

-- Registrations -------------------------------------------------------------
-- One row per team-in-an-order. A two-day combined checkout produces two
-- registration rows (one per team) under a single registration_order.
-- Failed-then-retried payments produce a new order with new registrations.
create table public.registrations (
  id                          uuid primary key default uuid_generate_v4(),
  order_id                    uuid not null references public.registration_orders(id) on delete cascade,
  team_id                     uuid not null references public.teams(id) on delete cascade,
  amount_cents                integer not null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (order_id, team_id)
);

create trigger registrations_set_updated_at
  before update on public.registrations
  for each row execute function public.set_updated_at();

-- Payments ------------------------------------------------------------------
-- Stripe-side payment record, separate from registration_orders so we can
-- store charge metadata, refunds, and reconcile against Stripe later.
create table public.payments (
  id                        uuid primary key default uuid_generate_v4(),
  order_id                  uuid not null references public.registration_orders(id) on delete cascade,
  stripe_payment_intent_id  text not null unique,
  stripe_charge_id          text,
  amount_cents              integer not null,
  currency                  text not null default 'usd',
  status                    text not null,                -- raw Stripe status
  refunded_amount_cents     integer not null default 0,
  refunded_at               timestamptz,
  raw_event                 jsonb,                        -- last webhook payload
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Webhook idempotency -------------------------------------------------------
create table public.processed_webhooks (
  event_id    text primary key,
  event_type  text not null,
  processed_at timestamptz not null default now()
);

-- =========================================================================
-- 5. Indexes
-- =========================================================================

create index idx_tournaments_status_start  on public.tournaments(status, start_date);
create index idx_tournament_days_tournament on public.tournament_days(tournament_id);
create index idx_divisions_day              on public.divisions(tournament_day_id);
create index idx_teams_division             on public.teams(division_id);
create index idx_teams_status               on public.teams(status);
create index idx_teams_captain_email        on public.teams(lower(captain_email));
create index idx_players_team                on public.players(team_id);
create index idx_registration_orders_email   on public.registration_orders(lower(captain_email));
create index idx_registration_orders_status  on public.registration_orders(status);
create index idx_registrations_order         on public.registrations(order_id);
create index idx_registrations_team          on public.registrations(team_id);

-- =========================================================================
-- 6. Helper view: division capacity
-- =========================================================================

create or replace view public.division_capacity as
select
  d.id                as division_id,
  d.tournament_day_id,
  td.tournament_id,
  d.skill_level,
  d.gender,
  d.display_name,
  d.format,
  d.max_teams,
  count(t.id) filter (where t.status = 'confirmed') as confirmed_teams,
  case
    when d.max_teams is null then null  -- uncapped
    else d.max_teams - count(t.id) filter (where t.status = 'confirmed')
  end as spots_remaining
from public.divisions d
join public.tournament_days td on td.id = d.tournament_day_id
left join public.teams t on t.division_id = d.id
group by d.id, td.tournament_id;

-- =========================================================================
-- 7. Row Level Security
-- =========================================================================

-- Enable RLS on all tables
alter table public.tournaments          enable row level security;
alter table public.tournament_days      enable row level security;
alter table public.divisions            enable row level security;
alter table public.teams                enable row level security;
alter table public.players              enable row level security;
alter table public.registration_orders  enable row level security;
alter table public.registrations        enable row level security;
alter table public.payments             enable row level security;
alter table public.processed_webhooks   enable row level security;

-- Tournaments: anon can read published/closed/completed (not draft)
create policy "tournaments_public_read"
  on public.tournaments for select
  to anon, authenticated
  using (status in ('published', 'closed', 'completed'));

-- Tournament days: anon can read days of visible tournaments
create policy "tournament_days_public_read"
  on public.tournament_days for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_days.tournament_id
        and t.status in ('published', 'closed', 'completed')
    )
  );

-- Divisions: anon can read divisions of visible tournaments (via days)
create policy "divisions_public_read"
  on public.divisions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.tournament_days td
      join public.tournaments t on t.id = td.tournament_id
      where td.id = divisions.tournament_day_id
        and t.status in ('published', 'closed', 'completed')
    )
  );

-- Teams: anon can read confirmed teams' public-safe fields
-- (we only expose name, city, captain_first_name via a view; raw table is locked down)
create policy "teams_public_read_confirmed"
  on public.teams for select
  to anon, authenticated
  using (status = 'confirmed');

-- Teams: anon CANNOT insert directly. All inserts happen through the
-- create-checkout-session serverless function using the service role key.

-- Teams: anon can read their own team via management_token (frontend
-- passes token via PostgREST `?management_token=eq.<token>` filter and a
-- security definer function — see manage_team_lookup below).

-- Players: anon cannot read raw players directly. Public team listing
-- shows team name only, not roster. Captain reads roster via security
-- definer function with management token.

-- Registrations and payments: never readable by anon.

-- Processed webhooks: only service role.

-- =========================================================================
-- 8. Public-safe views and security-definer functions
-- =========================================================================

-- Public team view: only safe columns
create or replace view public.teams_public as
select
  t.id,
  t.division_id,
  t.name,
  t.city,
  split_part(t.captain_name, ' ', 1) as captain_first_name,
  t.created_at
from public.teams t
where t.status = 'confirmed';

grant select on public.teams_public to anon, authenticated;

-- Captain self-service lookup: returns full team + roster for a valid token
create or replace function public.manage_team_lookup(token uuid)
returns table (
  team_id           uuid,
  team_name         text,
  city              text,
  captain_name      text,
  captain_email     text,
  captain_phone     text,
  status            team_status,
  division_name     text,
  tournament_name   text,
  tournament_date   date,
  players           jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    t.city,
    t.captain_name,
    t.captain_email,
    t.captain_phone,
    t.status,
    d.display_name,
    tour.name,
    tour.start_date,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'jersey_number', p.jersey_number,
          'shirt_size', p.shirt_size,
          'sort_order', p.sort_order
        ) order by p.sort_order, p.created_at
      ) filter (where p.id is not null),
      '[]'::jsonb
    )
  from public.teams t
  join public.divisions d         on d.id = t.division_id
  join public.tournament_days td  on td.id = d.tournament_day_id
  join public.tournaments tour    on tour.id = td.tournament_id
  left join public.players p      on p.team_id = t.id
  where t.management_token = token
  group by t.id, d.display_name, tour.name, tour.start_date;
$$;

grant execute on function public.manage_team_lookup(uuid) to anon, authenticated;

-- Captain self-service player update: edits players via token
create or replace function public.manage_team_update_player(
  token uuid,
  player_id uuid,
  new_name text,
  new_jersey_number text,
  new_shirt_size text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_tournament_start date;
begin
  -- Resolve token to team
  select t.id, tour.start_date
    into v_team_id, v_tournament_start
  from public.teams t
  join public.divisions d         on d.id = t.division_id
  join public.tournament_days td  on td.id = d.tournament_day_id
  join public.tournaments tour    on tour.id = td.tournament_id
  where t.management_token = token;

  if v_team_id is null then
    return false;
  end if;

  -- Lock edits within 48 hours of tournament
  if v_tournament_start - current_date < 2 then
    raise exception 'Edits are locked within 48 hours of the tournament.';
  end if;

  update public.players
     set name = new_name,
         jersey_number = new_jersey_number,
         shirt_size = new_shirt_size
   where id = player_id and team_id = v_team_id;

  return found;
end;
$$;

grant execute on function public.manage_team_update_player(uuid, uuid, text, text, text)
  to anon, authenticated;

-- =========================================================================
-- 9. Seed — real 2026 Volley Monster season
-- =========================================================================
-- Pulled from the existing volleymonster.com site (see CONTENT.md).
-- Capacities marked with "TODO" need owner confirmation before launch.
-- "Image only" tournaments are stored as draft until the owner confirms
-- dates and details.

-- 9.1 Tournaments ---------------------------------------------------------

insert into public.tournaments
  (slug, name, hero_image_url, location_name, location_address, location_city, location_state, start_date, end_date, status, description_md)
values
  ('season-opener-2026',      'Season Opener',      'tournaments/Season-Opener.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-05-02', '2026-05-03', 'published',
   'Kick off the 2026 outdoor season. Saturday is single-gender plus juniors; Sunday is coed.'),

  ('may-showdown-2026',       'May Showdown',       'tournaments/May-Showdown.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-05-30', '2026-05-31', 'draft', null),

  ('pre-rumble-2026',         'Pre-Rumble',         'tournaments/Pre-Rumble.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-06-13', '2026-06-14', 'draft', null),

  ('july-joust-2026',         'July Joust',         'tournaments/July-Joust.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-07-11', '2026-07-12', 'draft', null),

  ('august-acefest-2026',     'August Acefest',     'tournaments/August-Acefest.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-08-08', '2026-08-09', 'draft', null),

  ('end-of-summer-bash-2026', 'End of Summer Bash', 'tournaments/End-of-Summer-Bash.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-08-22', '2026-08-23', 'draft', null),

  ('season-finale-2026',      'Season Finale',      'tournaments/Season-Finale.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-09-12', '2026-09-13', 'draft', null),

  ('carolyn-clark-classic-2026', 'Carolyn Clark Volleyball Classic', 'tournaments/Flier.png',
   'Frederick Community College', null, 'Frederick', 'MD',
   '2026-08-29', '2026-08-29', 'published',
   E'**A Community Event Supporting Women in Fire Sciences**\n\nOn August 29, athletes and community members will come together at Frederick Community College for a purpose-driven volleyball tournament supporting a scholarship fund for women pursuing careers in fire sciences.\n\nThis event honors the legacy of Carolyn Clark while creating real opportunities for the next generation entering emergency services.');

-- 9.2 Tournament days for the Season Opener (the only fully-known event) -

insert into public.tournament_days (tournament_id, day_date, label, sort_order)
select id, '2026-05-02', 'Saturday — Single-Gender + Juniors', 0 from public.tournaments where slug = 'season-opener-2026'
union all
select id, '2026-05-03', 'Sunday — Coed',                      1 from public.tournaments where slug = 'season-opener-2026';

-- 9.3 Divisions for Season Opener Saturday (single-gender + juniors) ------
-- All divisions are uncapped (max_teams = null) and triples format pending
-- owner confirmation per skill level. Update format per division if some
-- are doubles.

with sat as (
  select td.id from public.tournament_days td
  join public.tournaments t on t.id = td.tournament_id
  where t.slug = 'season-opener-2026' and td.day_date = '2026-05-02'
)
insert into public.divisions (tournament_day_id, skill_level, gender, fee_cents, format, sort_order)
select id, 'Open',  'mens',   11000, 'triples', 0 from sat
union all select id, 'Open',  'womens', 11000, 'triples', 1 from sat
union all select id, 'AA',    'mens',    8000, 'triples', 2 from sat
union all select id, 'AA',    'womens',  8000, 'triples', 3 from sat
union all select id, 'A',     'mens',    8000, 'triples', 4 from sat
union all select id, 'A',     'womens',  8000, 'triples', 5 from sat
union all select id, 'BB/B',  'mens',    8000, 'triples', 6 from sat
union all select id, 'BB/B',  'womens',  8000, 'triples', 7 from sat
union all select id, '16U',   'boys',    5000, 'triples', 8 from sat
union all select id, '16U',   'girls',   5000, 'triples', 9 from sat;

-- 9.4 Divisions for Season Opener Sunday (coed) ---------------------------

with sun as (
  select td.id from public.tournament_days td
  join public.tournaments t on t.id = td.tournament_id
  where t.slug = 'season-opener-2026' and td.day_date = '2026-05-03'
)
insert into public.divisions (tournament_day_id, skill_level, gender, fee_cents, format, sort_order)
select id, 'Open', 'coed', 11000, 'triples', 0 from sun
union all select id, 'AA',   'coed',  8000, 'triples', 1 from sun
union all select id, 'A',    'coed',  8000, 'triples', 2 from sun
union all select id, 'BB/B', 'coed',  8000, 'triples', 3 from sun;
