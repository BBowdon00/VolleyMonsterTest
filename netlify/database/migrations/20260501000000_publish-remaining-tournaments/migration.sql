-- Publish the remaining 2026 season tournaments that were seeded as drafts.

UPDATE public.tournaments
SET status = 'published'::tournament_status
WHERE status = 'draft'
  AND slug IN (
    'may-showdown-2026',
    'pre-rumble-2026',
    'july-joust-2026',
    'august-acefest-2026',
    'end-of-summer-bash-2026',
    'season-finale-2026'
  );
