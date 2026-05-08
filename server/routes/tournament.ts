import type { RouteConfig } from '../../api/_shim'
import { db } from './_lib/db'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return Response.json({ error: 'Missing slug' }, { status: 400 })

  const rows = await db.sql`
    SELECT
      t.id, t.slug, t.name, t.start_date, t.end_date,
      t.location_name, t.location_address, t.location_city, t.location_state,
      t.hero_image_url, t.description_md, t.status,
      t.registration_opens_at, t.registration_closes_at,
      td.id            AS day_id,
      td.tournament_id AS day_tournament_id,
      td.day_date, td.label, td.description_md AS day_description_md,
      td.check_in_time, td.sort_order AS day_sort_order,
      d.id             AS div_id,
      d.tournament_day_id,
      d.skill_level, d.gender, d.display_name, d.format,
      d.fee_cents, d.team_size, d.max_teams,
      d.sort_order     AS div_sort_order,
      COALESCE(dc.confirmed_teams, 0) AS confirmed_teams
    FROM tournaments t
    LEFT JOIN tournament_days td ON td.tournament_id = t.id
    LEFT JOIN divisions d ON d.tournament_day_id = td.id
    LEFT JOIN division_capacity dc ON dc.division_id = d.id
    WHERE t.slug = ${slug}
    ORDER BY td.sort_order NULLS LAST, d.sort_order NULLS LAST
  `

  if (rows.length === 0) return Response.json({ error: 'Tournament not found' }, { status: 404 })

  const dayMap = new Map<string, Record<string, unknown>>()
  let tourBase: Record<string, unknown> | null = null

  for (const r of rows as Record<string, unknown>[]) {
    if (!tourBase) {
      tourBase = {
        id: r['id'],
        slug: r['slug'],
        name: r['name'],
        start_date: r['start_date'],
        end_date: r['end_date'],
        location_name: r['location_name'],
        location_address: r['location_address'],
        location_city: r['location_city'],
        location_state: r['location_state'],
        hero_image_url: r['hero_image_url'],
        description_md: r['description_md'],
        status: r['status'],
        registration_opens_at: r['registration_opens_at'],
        registration_closes_at: r['registration_closes_at'],
      }
    }
    const dayId = r['day_id'] as string | null
    if (!dayId) continue
    if (!dayMap.has(dayId)) {
      dayMap.set(dayId, {
        id: dayId,
        tournament_id: r['day_tournament_id'],
        day_date: r['day_date'],
        label: r['label'],
        description_md: r['day_description_md'],
        check_in_time: r['check_in_time'],
        sort_order: r['day_sort_order'],
        divisions: [],
      })
    }
    const day = dayMap.get(dayId)!
    const divId = r['div_id'] as string | null
    if (!divId) continue
    const confirmedTeamCount = Number(r['confirmed_teams'] ?? 0)
    const maxTeams = r['max_teams'] as number | null
    ;(day['divisions'] as unknown[]).push({
      id: divId,
      tournament_day_id: r['tournament_day_id'],
      skill_level: r['skill_level'],
      gender: r['gender'],
      display_name: r['display_name'],
      format: r['format'],
      fee_cents: r['fee_cents'],
      team_size: r['team_size'],
      max_teams: maxTeams,
      confirmedTeamCount,
      status: maxTeams === null ? 'open' : confirmedTeamCount >= maxTeams ? 'closed' : 'open',
    })
  }

  const result = { ...tourBase, tournament_days: [...dayMap.values()] }

  return Response.json(result, {
    headers: {
      'Netlify-CDN-Cache-Control': `public, s-maxage=300, stale-while-revalidate=600`,
      'Netlify-Cache-ID': `tournaments,tournament-${slug}`,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}

export const config: RouteConfig = { path: '/api/tournament' }
