-- Volley Monster — seed data migration
-- Real 2026 Volley Monster season tournaments, days, and divisions.
-- Note: explicit type casts required on enum/date values inside UNION ALL
-- because PostgreSQL resolves untyped string literals to text in that context.

-- =========================================================================
-- 9.1 Tournaments
-- =========================================================================

INSERT INTO public.tournaments
  (slug, name, hero_image_url, location_name, location_address, location_city, location_state, start_date, end_date, status, description_md)
VALUES
  ('season-opener-2026', 'Season Opener', 'tournaments/Season-Opener.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-05-02'::date, '2026-05-03'::date, 'published'::tournament_status,
   'Kick off the 2026 outdoor season. Saturday is single-gender plus juniors; Sunday is coed.'),

  ('may-showdown-2026', 'May Showdown', 'tournaments/May-Showdown.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-05-30'::date, '2026-05-31'::date, 'draft'::tournament_status, null),

  ('pre-rumble-2026', 'Pre-Rumble', 'tournaments/Pre-Rumble.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-06-13'::date, '2026-06-14'::date, 'draft'::tournament_status, null),

  ('july-joust-2026', 'July Joust', 'tournaments/July-Joust.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-07-11'::date, '2026-07-12'::date, 'draft'::tournament_status, null),

  ('august-acefest-2026', 'August Acefest', 'tournaments/August-Acefest.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-08-08'::date, '2026-08-09'::date, 'draft'::tournament_status, null),

  ('end-of-summer-bash-2026', 'End of Summer Bash', 'tournaments/End-of-Summer-Bash.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-08-22'::date, '2026-08-23'::date, 'draft'::tournament_status, null),

  ('season-finale-2026', 'Season Finale', 'tournaments/Season-Finale.png',
   'Olney Manor Recreational Park', '16915 Batchellors Forest Road', 'Olney', 'MD',
   '2026-09-12'::date, '2026-09-13'::date, 'draft'::tournament_status, null),

  ('carolyn-clark-classic-2026', 'Carolyn Clark Volleyball Classic', 'tournaments/Flier.png',
   'Frederick Community College', null, 'Frederick', 'MD',
   '2026-08-29'::date, '2026-08-29'::date, 'published'::tournament_status,
   E'**A Community Event Supporting Women in Fire Sciences**\n\nOn August 29, athletes and community members will come together at Frederick Community College for a purpose-driven volleyball tournament supporting a scholarship fund for women pursuing careers in fire sciences.\n\nThis event honors the legacy of Carolyn Clark while creating real opportunities for the next generation entering emergency services.');

-- =========================================================================
-- 9.2 Tournament days for the Season Opener
-- =========================================================================

INSERT INTO public.tournament_days (tournament_id, day_date, label, sort_order)
SELECT id, '2026-05-02'::date, 'M/W Doubles',  0 FROM public.tournaments WHERE slug = 'season-opener-2026'
UNION ALL
SELECT id, '2026-05-03'::date, 'Coed Doubles', 1 FROM public.tournaments WHERE slug = 'season-opener-2026';

-- =========================================================================
-- 9.3 Divisions for Season Opener Saturday (single-gender + juniors)
-- =========================================================================

WITH sat AS (
  SELECT td.id FROM public.tournament_days td
  JOIN public.tournaments t ON t.id = td.tournament_id
  WHERE t.slug = 'season-opener-2026' AND td.day_date = '2026-05-02'::date
)
INSERT INTO public.divisions (tournament_day_id, skill_level, gender, fee_cents, format, sort_order)
SELECT id, 'Open',  'mens'::division_gender,   11000, 'doubles'::team_format, 0 FROM sat
UNION ALL SELECT id, 'Open',  'womens'::division_gender, 11000, 'doubles'::team_format, 1 FROM sat
UNION ALL SELECT id, 'AA',    'mens'::division_gender,    8000, 'doubles'::team_format, 2 FROM sat
UNION ALL SELECT id, 'AA',    'womens'::division_gender,  8000, 'doubles'::team_format, 3 FROM sat
UNION ALL SELECT id, 'A',     'mens'::division_gender,    8000, 'doubles'::team_format, 4 FROM sat
UNION ALL SELECT id, 'A',     'womens'::division_gender,  8000, 'doubles'::team_format, 5 FROM sat
UNION ALL SELECT id, 'BB/B',  'mens'::division_gender,    8000, 'doubles'::team_format, 6 FROM sat
UNION ALL SELECT id, 'BB/B',  'womens'::division_gender,  8000, 'doubles'::team_format, 7 FROM sat
UNION ALL SELECT id, '16U',   'boys'::division_gender,    5000, 'doubles'::team_format, 8 FROM sat
UNION ALL SELECT id, '16U',   'girls'::division_gender,   5000, 'doubles'::team_format, 9 FROM sat;

-- =========================================================================
-- 9.4 Divisions for Season Opener Sunday (coed)
-- =========================================================================

WITH sun AS (
  SELECT td.id FROM public.tournament_days td
  JOIN public.tournaments t ON t.id = td.tournament_id
  WHERE t.slug = 'season-opener-2026' AND td.day_date = '2026-05-03'::date
)
INSERT INTO public.divisions (tournament_day_id, skill_level, gender, fee_cents, format, sort_order)
SELECT id, 'Open', 'coed'::division_gender, 11000, 'doubles'::team_format, 0 FROM sun
UNION ALL SELECT id, 'AA',   'coed'::division_gender,  8000, 'doubles'::team_format, 1 FROM sun
UNION ALL SELECT id, 'A',    'coed'::division_gender,  8000, 'doubles'::team_format, 2 FROM sun
UNION ALL SELECT id, 'BB/B', 'coed'::division_gender,  8000, 'doubles'::team_format, 3 FROM sun;
