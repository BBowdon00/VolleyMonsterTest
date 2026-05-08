-- Add days + divisions for the 6 remaining 2026 season tournaments,
-- cloning the Season Opener structure:
--   Day 1 (start_date): single-gender doubles + 16U juniors
--   Day 2 (end_date):   coed doubles
-- Carolyn Clark is intentionally excluded — different format, configured later.

INSERT INTO public.tournament_days (tournament_id, day_date, label, sort_order)
SELECT t.id, t.start_date, 'M/W Doubles', 0
FROM public.tournaments t
WHERE t.slug IN (
  'may-showdown-2026',
  'pre-rumble-2026',
  'july-joust-2026',
  'august-acefest-2026',
  'end-of-summer-bash-2026',
  'season-finale-2026'
)
UNION ALL
SELECT t.id, t.end_date, 'Coed Doubles', 1
FROM public.tournaments t
WHERE t.slug IN (
  'may-showdown-2026',
  'pre-rumble-2026',
  'july-joust-2026',
  'august-acefest-2026',
  'end-of-summer-bash-2026',
  'season-finale-2026'
);

-- Saturday divisions (single-gender + juniors) for all 6
INSERT INTO public.divisions (tournament_day_id, skill_level, gender, fee_cents, format, sort_order)
SELECT td.id, v.skill_level, v.gender::division_gender, v.fee_cents,
       'doubles'::team_format, v.sort_order
FROM (VALUES
  ('Open',  'mens',   11000, 0),
  ('Open',  'womens', 11000, 1),
  ('AA',    'mens',    8000, 2),
  ('AA',    'womens',  8000, 3),
  ('A',     'mens',    8000, 4),
  ('A',     'womens',  8000, 5),
  ('BB/B',  'mens',    8000, 6),
  ('BB/B',  'womens',  8000, 7),
  ('16U',   'boys',    5000, 8),
  ('16U',   'girls',   5000, 9)
) AS v(skill_level, gender, fee_cents, sort_order)
CROSS JOIN public.tournament_days td
JOIN public.tournaments t ON t.id = td.tournament_id
WHERE t.slug IN (
  'may-showdown-2026',
  'pre-rumble-2026',
  'july-joust-2026',
  'august-acefest-2026',
  'end-of-summer-bash-2026',
  'season-finale-2026'
)
  AND td.label = 'M/W Doubles';

-- Sunday divisions (coed) for all 6
INSERT INTO public.divisions (tournament_day_id, skill_level, gender, fee_cents, format, sort_order)
SELECT td.id, v.skill_level, v.gender::division_gender, v.fee_cents,
       'doubles'::team_format, v.sort_order
FROM (VALUES
  ('Open', 'coed', 11000, 0),
  ('AA',   'coed',  8000, 1),
  ('A',    'coed',  8000, 2),
  ('BB/B', 'coed',  8000, 3)
) AS v(skill_level, gender, fee_cents, sort_order)
CROSS JOIN public.tournament_days td
JOIN public.tournaments t ON t.id = td.tournament_id
WHERE t.slug IN (
  'may-showdown-2026',
  'pre-rumble-2026',
  'july-joust-2026',
  'august-acefest-2026',
  'end-of-summer-bash-2026',
  'season-finale-2026'
)
  AND td.label = 'Coed Doubles';
