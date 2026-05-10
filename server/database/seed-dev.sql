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

-- =========================================================================
-- May Showdown 2026 — teams (ms01–ms43@test.vm)
-- =========================================================================

-- Saturday 2026-05-30 — Men's Open
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Volt Force','Bethesda','Alex Carter','ms01@test.vm'),('Sky Hammers','Rockville','Sam Johnson','ms02@test.vm'),('Rim Rockers','Silver Spring','Jordan Lee','ms03@test.vm'),('Wall Crushers','Potomac','Casey Kim','ms04@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='Open' AND d.gender='mens'::division_gender) d;

-- Saturday 2026-05-30 — Women's Open
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Spike Queens','Chevy Chase','Morgan Davis','ms05@test.vm'),('Net Blazers','Gaithersburg','Taylor Wilson','ms06@test.vm'),('Dig Nation','Germantown','Riley Garcia','ms07@test.vm'),('Block Stars','Clarksburg','Quinn Torres','ms08@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='Open' AND d.gender='womens'::division_gender) d;

-- Saturday 2026-05-30 — Men's AA
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Ace Storm','Olney','Devon Chen','ms09@test.vm'),('Topspin','Laurel','Avery Park','ms10@test.vm'),('The Setters','Columbia','Blake Martinez','ms11@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='AA' AND d.gender='mens'::division_gender) d;

-- Saturday 2026-05-30 — Women's AA
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Soft Touch','Bowie','Drew Anderson','ms12@test.vm'),('Float Queens','Greenbelt','Jamie Thompson','ms13@test.vm'),('Angle Attack','College Park','Reese Robinson','ms14@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='AA' AND d.gender='womens'::division_gender) d;

-- Saturday 2026-05-30 — Men's A
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Sand Dogs','Bethesda','Chris Hall','ms15@test.vm'),('Serve Aces','Rockville','Pat Young','ms16@test.vm'),('Kill Shot','Silver Spring','Robin Allen','ms17@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='A' AND d.gender='mens'::division_gender) d;

-- Saturday 2026-05-30 — Women's A
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Back Row Bosses','Gaithersburg','Skyler Scott','ms18@test.vm'),('Jump Serve','Chevy Chase','Frankie King','ms19@test.vm'),('Cross Court','Potomac','Emery Wright','ms20@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='A' AND d.gender='womens'::division_gender) d;

-- Saturday 2026-05-30 — Men's BB/B
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Just Passing','Laurel','Terry Brooks','ms21@test.vm'),('Hitters Inc','Columbia','Kai Foster','ms22@test.vm'),('Wing It','Clarksburg','Sage Reed','ms23@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='BB/B' AND d.gender='mens'::division_gender) d;

-- Saturday 2026-05-30 — Women's BB/B
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Rally Cats','Olney','Charlie Price','ms24@test.vm'),('Net Gain','Bowie','Alex Ross','ms25@test.vm'),('Dig Deep','Greenbelt','Sam Bailey','ms26@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='BB/B' AND d.gender='womens'::division_gender) d;

-- Saturday 2026-05-30 — Boys 16U
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Future Aces','College Park','Jordan Reed','ms27@test.vm'),('Young Guns','Bethesda','Tyler Cross','ms28@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='16U' AND d.gender='boys'::division_gender) d;

-- Saturday 2026-05-30 — Girls 16U
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Rise Up','Rockville','Avery Quinn','ms29@test.vm'),('Next Wave','Silver Spring','Blake Morgan','ms30@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-30'::date AND d.skill_level='16U' AND d.gender='girls'::division_gender) d;

-- Sunday 2026-05-31 — Coed Open
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Gender Benders','Bethesda','Dana Foster','ms31@test.vm'),('Mix Masters','Rockville','Lane Cooper','ms32@test.vm'),('Duo Dynamic','Silver Spring','Ash Nguyen','ms33@test.vm'),('Coed Vibes','Potomac','Cameron Bell','ms34@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-31'::date AND d.skill_level='Open' AND d.gender='coed'::division_gender) d;

-- Sunday 2026-05-31 — Coed AA
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Double Trouble','Columbia','Morgan Walsh','ms35@test.vm'),('Set Up Shop','Laurel','Jesse Patel','ms36@test.vm'),('Mixed Nuts','Olney','Harley Simmons','ms37@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-31'::date AND d.skill_level='AA' AND d.gender='coed'::division_gender) d;

-- Sunday 2026-05-31 — Coed A
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Pair Force','Gaithersburg','Parker Reeves','ms38@test.vm'),('Together We Dig','Germantown','Casey Tran','ms39@test.vm'),('Rally Together','Clarksburg','Rowan Ellis','ms40@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-31'::date AND d.skill_level='A' AND d.gender='coed'::division_gender) d;

-- Sunday 2026-05-31 — Coed BB/B
INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
SELECT d.id, v.name, v.city, v.cname, v.email, '555-0200', 'confirmed'::team_status
FROM (VALUES ('Sand & Sun','Bowie','Quinn Larson','ms41@test.vm'),('Just Wing It','Greenbelt','River Stone','ms42@test.vm'),('Good Vibes','College Park','Peyton Cole','ms43@test.vm')) AS v(name,city,cname,email)
CROSS JOIN (SELECT d.id FROM public.divisions d JOIN public.tournament_days td ON td.id=d.tournament_day_id JOIN public.tournaments t ON t.id=td.tournament_id WHERE t.slug='may-showdown-2026' AND td.day_date='2026-05-31'::date AND d.skill_level='BB/B' AND d.gender='coed'::division_gender) d;

-- =========================================================================
-- May Showdown players: 2 per team
-- =========================================================================

INSERT INTO public.players (team_id, name, sort_order)
SELECT t.id, v.player_name, v.sort_order
FROM (VALUES
  ('ms01@test.vm','Alex Carter',0),('ms01@test.vm','Ryan Torres',1),
  ('ms02@test.vm','Sam Johnson',0),('ms02@test.vm','Mike Chen',1),
  ('ms03@test.vm','Jordan Lee',0),('ms03@test.vm','Taylor Park',1),
  ('ms04@test.vm','Casey Kim',0),('ms04@test.vm','Drew Davis',1),
  ('ms05@test.vm','Morgan Davis',0),('ms05@test.vm','Skyler Ross',1),
  ('ms06@test.vm','Taylor Wilson',0),('ms06@test.vm','Riley Brooks',1),
  ('ms07@test.vm','Riley Garcia',0),('ms07@test.vm','Quinn Hall',1),
  ('ms08@test.vm','Quinn Torres',0),('ms08@test.vm','Jamie Scott',1),
  ('ms09@test.vm','Devon Chen',0),('ms09@test.vm','Avery King',1),
  ('ms10@test.vm','Avery Park',0),('ms10@test.vm','Blake Wright',1),
  ('ms11@test.vm','Blake Martinez',0),('ms11@test.vm','Drew Allen',1),
  ('ms12@test.vm','Drew Anderson',0),('ms12@test.vm','Frankie Young',1),
  ('ms13@test.vm','Jamie Thompson',0),('ms13@test.vm','Emery Price',1),
  ('ms14@test.vm','Reese Robinson',0),('ms14@test.vm','Chris Foster',1),
  ('ms15@test.vm','Chris Hall',0),('ms15@test.vm','Pat Reed',1),
  ('ms16@test.vm','Pat Young',0),('ms16@test.vm','Robin Cross',1),
  ('ms17@test.vm','Robin Allen',0),('ms17@test.vm','Terry Bailey',1),
  ('ms18@test.vm','Skyler Scott',0),('ms18@test.vm','Kai Morgan',1),
  ('ms19@test.vm','Frankie King',0),('ms19@test.vm','Sage Cooper',1),
  ('ms20@test.vm','Emery Wright',0),('ms20@test.vm','Charlie Nguyen',1),
  ('ms21@test.vm','Terry Brooks',0),('ms21@test.vm','Alex Bell',1),
  ('ms22@test.vm','Kai Foster',0),('ms22@test.vm','Sam Walsh',1),
  ('ms23@test.vm','Sage Reed',0),('ms23@test.vm','Jordan Patel',1),
  ('ms24@test.vm','Charlie Price',0),('ms24@test.vm','Casey Simmons',1),
  ('ms25@test.vm','Alex Ross',0),('ms25@test.vm','Morgan Reeves',1),
  ('ms26@test.vm','Sam Bailey',0),('ms26@test.vm','Devon Tran',1),
  ('ms27@test.vm','Jordan Reed',0),('ms27@test.vm','Tyler Ellis',1),
  ('ms28@test.vm','Tyler Cross',0),('ms28@test.vm','River Larson',1),
  ('ms29@test.vm','Avery Quinn',0),('ms29@test.vm','Blake Stone',1),
  ('ms30@test.vm','Blake Morgan',0),('ms30@test.vm','Drew Cole',1),
  ('ms31@test.vm','Dana Foster',0),('ms31@test.vm','Lane Torres',1),
  ('ms32@test.vm','Lane Cooper',0),('ms32@test.vm','Ash Johnson',1),
  ('ms33@test.vm','Ash Nguyen',0),('ms33@test.vm','Cameron Lee',1),
  ('ms34@test.vm','Cameron Bell',0),('ms34@test.vm','Dana Kim',1),
  ('ms35@test.vm','Morgan Walsh',0),('ms35@test.vm','Jesse Davis',1),
  ('ms36@test.vm','Jesse Patel',0),('ms36@test.vm','Harley Wilson',1),
  ('ms37@test.vm','Harley Simmons',0),('ms37@test.vm','Parker Garcia',1),
  ('ms38@test.vm','Parker Reeves',0),('ms38@test.vm','Casey Hall',1),
  ('ms39@test.vm','Casey Tran',0),('ms39@test.vm','Rowan Scott',1),
  ('ms40@test.vm','Rowan Ellis',0),('ms40@test.vm','River King',1),
  ('ms41@test.vm','Quinn Larson',0),('ms41@test.vm','Peyton Wright',1),
  ('ms42@test.vm','River Stone',0),('ms42@test.vm','Quinn Allen',1),
  ('ms43@test.vm','Peyton Cole',0),('ms43@test.vm','River Young',1)
) AS v(email, player_name, sort_order)
JOIN public.teams t ON t.captain_email = v.email;
