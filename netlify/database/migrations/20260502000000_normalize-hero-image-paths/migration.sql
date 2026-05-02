-- Make hero_image_url values root-relative so they resolve correctly
-- from any page (including /tournaments/:slug detail routes).
-- Skips values that are already absolute or already root-relative.

UPDATE public.tournaments
SET hero_image_url = '/' || hero_image_url
WHERE hero_image_url IS NOT NULL
  AND hero_image_url NOT LIKE '/%'
  AND hero_image_url NOT LIKE 'http://%'
  AND hero_image_url NOT LIKE 'https://%';
