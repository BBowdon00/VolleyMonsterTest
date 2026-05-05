-- Season passes: one per person, covers proportional share of non-Open division fees for the season

CREATE TYPE season_pass_status AS ENUM ('pending_payment', 'active', 'cancelled');

CREATE TABLE public.season_passes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                        TEXT NOT NULL UNIQUE,
  holder_name                 TEXT,
  holder_email                TEXT,
  year                        INTEGER NOT NULL DEFAULT 2026,
  status                      season_pass_status NOT NULL DEFAULT 'pending_payment',
  stripe_checkout_session_id  TEXT UNIQUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER season_passes_set_updated_at
  BEFORE UPDATE ON public.season_passes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_season_passes_code   ON public.season_passes(upper(code));
CREATE INDEX idx_season_passes_email  ON public.season_passes(lower(holder_email)) WHERE holder_email IS NOT NULL;
CREATE INDEX idx_season_passes_status ON public.season_passes(status);

-- Audit trail of every redemption
CREATE TABLE public.season_pass_uses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id         UUID NOT NULL REFERENCES public.season_passes(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  discount_cents  INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_season_pass_uses_pass ON public.season_pass_uses(pass_id);
CREATE INDEX idx_season_pass_uses_team ON public.season_pass_uses(team_id);
