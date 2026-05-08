-- Dev seed: fake confirmed teams + players for Season Opener 2026
-- Idempotent — safe to run multiple times (uses ON CONFLICT DO NOTHING).
-- Identify test data by captain_email LIKE '%@test.vm'.

-- =========================================================================
-- Clean up any previous test run
-- =========================================================================

DELETE FROM public.players
WHERE team_id IN (SELECT id FROM public.teams WHERE captain_email LIKE '%@test.vm');

DELETE FROM public.registrations
WHERE team_id IN (SELECT id FROM public.teams WHERE captain_email LIKE '%@test.vm');

DELETE FROM public.teams WHERE captain_email LIKE '%@test.vm';

-- =========================================================================
-- Helper: insert teams for a division by slug + day + skill + gender
-- =========================================================================

-- Saturday — Men's Open
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Sand Sharks','Bethesda','Alex Carter','t01@test.vm'),('Net Ninjas','Rockville','Sam Johnson','t02@test.vm'),('Spike Squad','Silver Spring','Jordan Lee','t03@test.vm'),('Block Party','Potomac','Casey Kim','t04@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='Open' AND d.gender='mens'::division_gender) d;

-- Saturday — Women's Open
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Dig Dynasty','Chevy Chase','Morgan Davis','t05@test.vm'),('Ace Factory','Gaithersburg','Taylor Wilson','t06@test.vm'),('Serve Nation','Germantown','Riley Garcia','t07@test.vm'),('Kill Crew','Clarksburg','Quinn Torres','t08@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='Open' AND d.gender='womens'::division_gender) d;

-- Saturday — Men's AA
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Set Masters','Olney','Devon Chen','t09@test.vm'),('Bump Brigade','Laurel','Avery Park','t10@test.vm'),('Float Mob','Columbia','Blake Martinez','t11@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='AA' AND d.gender='mens'::division_gender) d;

-- Saturday — Women's AA
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Court Jesters','Bowie','Drew Anderson','t12@test.vm'),('Roof Wreckers','Greenbelt','Jamie Thompson','t13@test.vm'),('Dig or Die','College Park','Reese Robinson','t14@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='AA' AND d.gender='womens'::division_gender) d;

-- Saturday — Men's A
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Sand Sharks','Bethesda','Chris Hall','t15@test.vm'),('Net Ninjas','Rockville','Pat Young','t16@test.vm'),('Spike Squad','Silver Spring','Robin Allen','t17@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='A' AND d.gender='mens'::division_gender) d;

-- Saturday — Women's A
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Ace Factory','Gaithersburg','Skyler Scott','t18@test.vm'),('Dig Dynasty','Chevy Chase','Frankie King','t19@test.vm'),('Block Party','Potomac','Emery Wright','t20@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='A' AND d.gender='womens'::division_gender) d;

-- Saturday — Men's BB/B
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Bump Brigade','Laurel','Terry Brooks','t21@test.vm'),('Float Mob','Columbia','Kai Foster','t22@test.vm'),('Kill Crew','Clarksburg','Sage Reed','t23@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='BB/B' AND d.gender='mens'::division_gender) d;

-- Saturday — Women's BB/B
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Set Masters','Olney','Charlie Price','t24@test.vm'),('Court Jesters','Bowie','Alex Ross','t25@test.vm'),('Roof Wreckers','Greenbelt','Sam Bailey','t26@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='BB/B' AND d.gender='womens'::division_gender) d;

-- Saturday — Boys 16U
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Dig or Die','College Park','Jordan Reed','t27@test.vm'),('Sand Sharks','Bethesda','Tyler Cross','t28@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='16U' AND d.gender='boys'::division_gender) d;

-- Saturday — Girls 16U
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Net Ninjas','Rockville','Avery Quinn','t29@test.vm'),('Spike Squad','Silver Spring','Blake Morgan','t30@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-02'::date AND d.skill_level='16U' AND d.gender='girls'::division_gender) d;

-- Sunday — Coed Open
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Mixed Signals','Bethesda','Dana Foster','t31@test.vm'),('Coed Chaos','Rockville','Lane Cooper','t32@test.vm'),('Power Couple','Silver Spring','Ash Nguyen','t33@test.vm'),('Net Worth','Potomac','Cameron Bell','t34@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-03'::date AND d.skill_level='Open' AND d.gender='coed'::division_gender) d;

-- Sunday — Coed AA
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Side Out','Columbia','Morgan Walsh','t35@test.vm'),('Two Much Fun','Laurel','Jesse Patel','t36@test.vm'),('Serve Together','Olney','Harley Simmons','t37@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-03'::date AND d.skill_level='AA' AND d.gender='coed'::division_gender) d;

-- Sunday — Coed A
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Dig Duo','Gaithersburg','Parker Reeves','t38@test.vm'),('Volley Dolls','Germantown','Casey Tran','t39@test.vm'),('Bump & Grind','Clarksburg','Rowan Ellis','t40@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-03'::date AND d.skill_level='A' AND d.gender='coed'::division_gender) d;

-- Sunday — Coed BB/B
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0100', 'confirmed'::team_status
FROM (VALUES ('Beach Buddies','Bowie','Quinn Larson','t41@test.vm'),('Just for Fun','Greenbelt','River Stone','t42@test.vm'),('Sand Traps','College Park','Peyton Cole','t43@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='season-opener-2026' AND td.day_date='2026-05-03'::date AND d.skill_level='BB/B' AND d.gender='coed'::division_gender) d;

-- =========================================================================
-- Players: 2 per team (doubles)
-- =========================================================================

INSERT INTO public.players (team_id, name, sort_order)
SELECT t.id, v.player_name, v.sort_order
FROM (VALUES
  ('t01@test.vm','Alex Carter',0),('t01@test.vm','Ryan Torres',1),
  ('t02@test.vm','Sam Johnson',0),('t02@test.vm','Mike Chen',1),
  ('t03@test.vm','Jordan Lee',0),('t03@test.vm','Taylor Park',1),
  ('t04@test.vm','Casey Kim',0),('t04@test.vm','Drew Davis',1),
  ('t05@test.vm','Morgan Davis',0),('t05@test.vm','Skyler Ross',1),
  ('t06@test.vm','Taylor Wilson',0),('t06@test.vm','Riley Brooks',1),
  ('t07@test.vm','Riley Garcia',0),('t07@test.vm','Quinn Hall',1),
  ('t08@test.vm','Quinn Torres',0),('t08@test.vm','Jamie Scott',1),
  ('t09@test.vm','Devon Chen',0),('t09@test.vm','Avery King',1),
  ('t10@test.vm','Avery Park',0),('t10@test.vm','Blake Wright',1),
  ('t11@test.vm','Blake Martinez',0),('t11@test.vm','Drew Allen',1),
  ('t12@test.vm','Drew Anderson',0),('t12@test.vm','Frankie Young',1),
  ('t13@test.vm','Jamie Thompson',0),('t13@test.vm','Emery Price',1),
  ('t14@test.vm','Reese Robinson',0),('t14@test.vm','Chris Foster',1),
  ('t15@test.vm','Chris Hall',0),('t15@test.vm','Pat Reed',1),
  ('t16@test.vm','Pat Young',0),('t16@test.vm','Robin Cross',1),
  ('t17@test.vm','Robin Allen',0),('t17@test.vm','Terry Bailey',1),
  ('t18@test.vm','Skyler Scott',0),('t18@test.vm','Kai Morgan',1),
  ('t19@test.vm','Frankie King',0),('t19@test.vm','Sage Cooper',1),
  ('t20@test.vm','Emery Wright',0),('t20@test.vm','Charlie Nguyen',1),
  ('t21@test.vm','Terry Brooks',0),('t21@test.vm','Alex Bell',1),
  ('t22@test.vm','Kai Foster',0),('t22@test.vm','Sam Walsh',1),
  ('t23@test.vm','Sage Reed',0),('t23@test.vm','Jordan Patel',1),
  ('t24@test.vm','Charlie Price',0),('t24@test.vm','Casey Simmons',1),
  ('t25@test.vm','Alex Ross',0),('t25@test.vm','Morgan Reeves',1),
  ('t26@test.vm','Sam Bailey',0),('t26@test.vm','Devon Tran',1),
  ('t27@test.vm','Jordan Reed',0),('t27@test.vm','Tyler Ellis',1),
  ('t28@test.vm','Tyler Cross',0),('t28@test.vm','River Larson',1),
  ('t29@test.vm','Avery Quinn',0),('t29@test.vm','Blake Stone',1),
  ('t30@test.vm','Blake Morgan',0),('t30@test.vm','Drew Cole',1),
  ('t31@test.vm','Dana Foster',0),('t31@test.vm','Lane Torres',1),
  ('t32@test.vm','Lane Cooper',0),('t32@test.vm','Ash Johnson',1),
  ('t33@test.vm','Ash Nguyen',0),('t33@test.vm','Cameron Lee',1),
  ('t34@test.vm','Cameron Bell',0),('t34@test.vm','Dana Kim',1),
  ('t35@test.vm','Morgan Walsh',0),('t35@test.vm','Jesse Davis',1),
  ('t36@test.vm','Jesse Patel',0),('t36@test.vm','Harley Wilson',1),
  ('t37@test.vm','Harley Simmons',0),('t37@test.vm','Parker Garcia',1),
  ('t38@test.vm','Parker Reeves',0),('t38@test.vm','Casey Hall',1),
  ('t39@test.vm','Casey Tran',0),('t39@test.vm','Rowan Scott',1),
  ('t40@test.vm','Rowan Ellis',0),('t40@test.vm','River King',1),
  ('t41@test.vm','Quinn Larson',0),('t41@test.vm','Peyton Wright',1),
  ('t42@test.vm','River Stone',0),('t42@test.vm','Quinn Allen',1),
  ('t43@test.vm','Peyton Cole',0),('t43@test.vm','River Young',1)
) AS v(email, player_name, sort_order)
JOIN public.teams t ON t.captain_email = v.email;
