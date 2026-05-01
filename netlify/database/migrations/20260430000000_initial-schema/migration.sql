-- Volley Monster — initial schema migration for Netlify Database
-- Conventions:
--   - All timestamps in UTC.
--   - Money in integer cents to avoid floating-point.
--   - UUIDs for all primary keys.
--   - created_at / updated_at on every table; trigger keeps updated_at fresh.

-- =========================================================================
-- 1. Extensions
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 2. Enums
-- =========================================================================

CREATE TYPE tournament_status AS ENUM (
  'draft',
  'published',
  'closed',
  'completed',
  'cancelled'
);

CREATE TYPE division_gender AS ENUM ('mens', 'womens', 'coed', 'boys', 'girls');

CREATE TYPE team_format AS ENUM ('doubles', 'triples', 'quads', 'sixes');

CREATE TYPE team_status AS ENUM (
  'pending_payment',
  'confirmed',
  'waitlisted',
  'cancelled'
);

CREATE TYPE registration_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded'
);

-- =========================================================================
-- 3. Helper: updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS 'BEGIN NEW.updated_at = NOW(); RETURN NEW; END';

-- =========================================================================
-- 4. Tables
-- =========================================================================

CREATE TABLE public.tournaments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                    TEXT NOT NULL UNIQUE,
  name                    TEXT NOT NULL,
  description_md          TEXT,
  hero_image_url          TEXT,
  location_name           TEXT,
  location_city           TEXT,
  location_state          TEXT,
  location_address        TEXT,
  start_date              DATE NOT NULL,
  end_date                DATE,
  registration_opens_at   TIMESTAMPTZ,
  registration_closes_at  TIMESTAMPTZ,
  schedule_md             TEXT,
  faq_md                  TEXT,
  status                  tournament_status NOT NULL DEFAULT 'draft',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tournaments_set_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tournament_days (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id  UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  day_date       DATE NOT NULL,
  label          TEXT,
  description_md TEXT,
  check_in_time  TIME,
  start_time     TIME,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, day_date)
);

CREATE TRIGGER tournament_days_set_updated_at
  BEFORE UPDATE ON public.tournament_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.divisions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_day_id UUID NOT NULL REFERENCES public.tournament_days(id) ON DELETE CASCADE,
  skill_level       TEXT NOT NULL,
  gender            division_gender NOT NULL,
  display_name      TEXT GENERATED ALWAYS AS (
    CASE
      WHEN gender = 'coed'   THEN skill_level
      WHEN gender = 'mens'   THEN 'Men''s '   || skill_level
      WHEN gender = 'womens' THEN 'Women''s ' || skill_level
      WHEN gender = 'boys'   THEN 'Boys'' '   || skill_level
      WHEN gender = 'girls'  THEN 'Girls'' '  || skill_level
    END
  ) STORED,
  fee_cents         INTEGER NOT NULL CHECK (fee_cents >= 0),
  max_teams         INTEGER CHECK (max_teams IS NULL OR max_teams > 0),
  format            team_format NOT NULL DEFAULT 'doubles',
  team_size         INTEGER GENERATED ALWAYS AS (
    CASE format
      WHEN 'doubles' THEN 2
      WHEN 'triples' THEN 3
      WHEN 'quads'   THEN 4
      WHEN 'sixes'   THEN 6
    END
  ) STORED,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_day_id, skill_level, gender)
);

CREATE TRIGGER divisions_set_updated_at
  BEFORE UPDATE ON public.divisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.teams (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id      UUID NOT NULL REFERENCES public.divisions(id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,
  city             TEXT,
  captain_name     TEXT NOT NULL,
  captain_email    TEXT NOT NULL,
  captain_phone    TEXT NOT NULL,
  status           team_status NOT NULL DEFAULT 'pending_payment',
  management_token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (division_id, name)
);

CREATE TRIGGER teams_set_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  jersey_number TEXT,
  shirt_size    TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.registration_orders (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  captain_email               TEXT NOT NULL,
  total_cents                 INTEGER NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'usd',
  status                      registration_status NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id  TEXT UNIQUE,
  stripe_payment_intent_id    TEXT UNIQUE,
  paid_at                     TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER registration_orders_set_updated_at
  BEFORE UPDATE ON public.registration_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.registrations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES public.registration_orders(id) ON DELETE CASCADE,
  team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, team_id)
);

CREATE TRIGGER registrations_set_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payments (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                  UUID NOT NULL REFERENCES public.registration_orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id  TEXT NOT NULL UNIQUE,
  stripe_charge_id          TEXT,
  amount_cents              INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'usd',
  status                    TEXT NOT NULL,
  refunded_amount_cents     INTEGER NOT NULL DEFAULT 0,
  refunded_at               TIMESTAMPTZ,
  raw_event                 JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.processed_webhooks (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- 5. Indexes
-- =========================================================================

CREATE INDEX idx_tournaments_status_start   ON public.tournaments(status, start_date);
CREATE INDEX idx_tournament_days_tournament  ON public.tournament_days(tournament_id);
CREATE INDEX idx_divisions_day               ON public.divisions(tournament_day_id);
CREATE INDEX idx_teams_division              ON public.teams(division_id);
CREATE INDEX idx_teams_status                ON public.teams(status);
CREATE INDEX idx_teams_captain_email         ON public.teams(lower(captain_email));
CREATE INDEX idx_players_team                ON public.players(team_id);
CREATE INDEX idx_registration_orders_email   ON public.registration_orders(lower(captain_email));
CREATE INDEX idx_registration_orders_status  ON public.registration_orders(status);
CREATE INDEX idx_registrations_order         ON public.registrations(order_id);
CREATE INDEX idx_registrations_team          ON public.registrations(team_id);

-- =========================================================================
-- 6. Helper view: division capacity
-- =========================================================================

CREATE OR REPLACE VIEW public.division_capacity AS
SELECT
  d.id                AS division_id,
  d.tournament_day_id,
  td.tournament_id,
  d.skill_level,
  d.gender,
  d.display_name,
  d.format,
  d.max_teams,
  COUNT(t.id) FILTER (WHERE t.status = 'confirmed') AS confirmed_teams,
  CASE
    WHEN d.max_teams IS NULL THEN NULL
    ELSE d.max_teams - COUNT(t.id) FILTER (WHERE t.status = 'confirmed')
  END AS spots_remaining
FROM public.divisions d
JOIN public.tournament_days td ON td.id = d.tournament_day_id
LEFT JOIN public.teams t ON t.division_id = d.id
GROUP BY d.id, td.tournament_id;

-- =========================================================================
-- 7. Row Level Security
-- =========================================================================

ALTER TABLE public.tournaments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_days      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhooks   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_public_read"
  ON public.tournaments FOR SELECT
  USING (status IN ('published', 'closed', 'completed'));

CREATE POLICY "tournament_days_public_read"
  ON public.tournament_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_days.tournament_id
        AND t.status IN ('published', 'closed', 'completed')
    )
  );

CREATE POLICY "divisions_public_read"
  ON public.divisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_days td
      JOIN public.tournaments t ON t.id = td.tournament_id
      WHERE td.id = divisions.tournament_day_id
        AND t.status IN ('published', 'closed', 'completed')
    )
  );

CREATE POLICY "teams_public_read_confirmed"
  ON public.teams FOR SELECT
  USING (status = 'confirmed');

-- =========================================================================
-- 8. Views and security-definer functions
-- =========================================================================

CREATE OR REPLACE VIEW public.teams_public AS
SELECT
  t.id,
  t.division_id,
  t.name,
  t.city,
  SPLIT_PART(t.captain_name, ' ', 1) AS captain_first_name,
  t.created_at
FROM public.teams t
WHERE t.status = 'confirmed';

CREATE OR REPLACE FUNCTION public.manage_team_lookup(token UUID)
RETURNS TABLE (
  team_id           UUID,
  team_name         TEXT,
  city              TEXT,
  captain_name      TEXT,
  captain_email     TEXT,
  captain_phone     TEXT,
  status            team_status,
  division_name     TEXT,
  tournament_name   TEXT,
  tournament_date   DATE,
  players           JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS '
  SELECT
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
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          ''id'', p.id,
          ''name'', p.name,
          ''jersey_number'', p.jersey_number,
          ''shirt_size'', p.shirt_size,
          ''sort_order'', p.sort_order
        ) ORDER BY p.sort_order, p.created_at
      ) FILTER (WHERE p.id IS NOT NULL),
      ''[]''::jsonb
    )
  FROM public.teams t
  JOIN public.divisions d         ON d.id = t.division_id
  JOIN public.tournament_days td  ON td.id = d.tournament_day_id
  JOIN public.tournaments tour    ON tour.id = td.tournament_id
  LEFT JOIN public.players p      ON p.team_id = t.id
  WHERE t.management_token = token
  GROUP BY t.id, d.display_name, tour.name, tour.start_date
';

CREATE OR REPLACE FUNCTION public.manage_team_update_player(
  token            UUID,
  player_id        UUID,
  new_name         TEXT,
  new_jersey_number TEXT,
  new_shirt_size   TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
DECLARE
  v_team_id          UUID;
  v_tournament_start DATE;
BEGIN
  SELECT t.id, tour.start_date
    INTO v_team_id, v_tournament_start
  FROM public.teams t
  JOIN public.divisions d         ON d.id = t.division_id
  JOIN public.tournament_days td  ON td.id = d.tournament_day_id
  JOIN public.tournaments tour    ON tour.id = td.tournament_id
  WHERE t.management_token = token;

  IF v_team_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_tournament_start - CURRENT_DATE < 2 THEN
    RAISE EXCEPTION ''Edits are locked within 48 hours of the tournament.'';
  END IF;

  UPDATE public.players
     SET name          = new_name,
         jersey_number = new_jersey_number,
         shirt_size    = new_shirt_size
   WHERE id = player_id AND team_id = v_team_id;

  RETURN FOUND;
END
';

CREATE OR REPLACE FUNCTION public.register_order(
  p_captain_email  TEXT,
  p_captain_name   TEXT,
  p_captain_phone  TEXT,
  p_captain_city   TEXT,
  p_total_cents    INTEGER,
  p_teams          JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
DECLARE
  v_order_id  UUID;
  v_team      JSONB;
  v_team_id   UUID;
  v_player    JSONB;
  v_result    JSONB := ''[]''::JSONB;
BEGIN
  INSERT INTO public.registration_orders (captain_email, total_cents, status)
  VALUES (lower(trim(p_captain_email)), p_total_cents, ''pending'')
  RETURNING id INTO v_order_id;

  FOR v_team IN SELECT * FROM jsonb_array_elements(p_teams)
  LOOP
    INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
    VALUES (
      (v_team->>''division_id'')::UUID,
      v_team->>''name'',
      NULLIF(trim(p_captain_city), ''''),
      p_captain_name,
      lower(trim(p_captain_email)),
      p_captain_phone,
      ''pending_payment''
    )
    RETURNING id INTO v_team_id;

    FOR v_player IN SELECT * FROM jsonb_array_elements(v_team->''players'')
    LOOP
      INSERT INTO public.players (team_id, name, shirt_size, jersey_number, sort_order)
      VALUES (
        v_team_id,
        v_player->>''name'',
        NULLIF(v_player->>''shirt_size'', ''''),
        NULLIF(v_player->>''jersey_number'', ''''),
        COALESCE((v_player->>''sort_order'')::INTEGER, 0)
      );
    END LOOP;

    INSERT INTO public.registrations (order_id, team_id, amount_cents)
    VALUES (
      v_order_id,
      v_team_id,
      (v_team->>''fee_cents'')::INTEGER
    );

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(''team_id'', v_team_id, ''division_id'', v_team->>''division_id'')
    );
  END LOOP;

  RETURN jsonb_build_object(''order_id'', v_order_id, ''teams'', v_result);
END
';
