-- seed-dev.sql: 5 confirmed fake teams per Season Opener 2026 division.
-- Idempotent — run as many times as you like.
-- Clean-up key: captain_email ends with @dev.vm.test

begin;

-- Remove any existing dev seed data (players cascade from teams, so delete registrations first)
delete from public.registrations
where team_id in (
  select id from public.teams where captain_email like '%@dev.vm.test'
);

delete from public.players
where team_id in (
  select id from public.teams where captain_email like '%@dev.vm.test'
);

delete from public.teams where captain_email like '%@dev.vm.test';

-- Insert 5 confirmed teams per division
do $$
declare
  div_rec  record;
  team_id  uuid;
  i        integer;
  p1_first text;
  p1_last  text;
  p2_first text;
  p2_last  text;
  firsts   text[] := array[
    'Alex','Jordan','Casey','Morgan','Taylor',
    'Riley','Quinn','Avery','Blake','Drew'
  ];
  lasts    text[] := array[
    'Smith','Johnson','Williams','Brown','Jones',
    'Miller','Davis','Wilson','Moore','Taylor'
  ];
begin
  for div_rec in
    select d.id as division_id
    from public.divisions d
    join public.tournament_days td on td.id = d.tournament_day_id
    join public.tournaments t      on t.id  = td.tournament_id
    where t.slug = 'season-opener-2026'
    order by td.sort_order, d.sort_order
  loop
    for i in 1..5 loop
      p1_first := firsts[i * 2 - 1];
      p1_last  := lasts [i * 2 - 1];
      p2_first := firsts[i * 2];
      p2_last  := lasts [i * 2];

      insert into public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
      values (
        div_rec.division_id,
        p1_last || ' / ' || p2_last,
        'Rockville',
        p1_first || ' ' || p1_last,
        'seed.' || substring(div_rec.division_id::text, 1, 8) || '.' || i || '@dev.vm.test',
        '555-555-0000',
        'confirmed'
      )
      returning id into team_id;

      insert into public.players (team_id, name, sort_order)
      values
        (team_id, p1_first || ' ' || p1_last, 0),
        (team_id, p2_first || ' ' || p2_last, 1);
    end loop;
  end loop;
end;
$$;

commit;
