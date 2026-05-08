import type { RouteConfig } from '../../api/_shim'
import { db } from './_lib/db'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const rows = await db.sql`
    SELECT
      t.id           AS team_id,
      t.name         AS team_name,
      t.city,
      t.captain_name,
      t.captain_email,
      t.captain_phone,
      t.status,
      d.display_name AS division_name,
      tour.name      AS tournament_name,
      tour.start_date AS tournament_date,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',            p.id,
            'name',          p.name,
            'jersey_number', p.jersey_number,
            'shirt_size',    p.shirt_size,
            'sort_order',    p.sort_order
          ) ORDER BY p.sort_order, p.created_at
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::jsonb
      ) AS players
    FROM public.teams t
    JOIN public.divisions d        ON d.id = t.division_id
    JOIN public.tournament_days td ON td.id = d.tournament_day_id
    JOIN public.tournaments tour   ON tour.id = td.tournament_id
    LEFT JOIN public.players p     ON p.team_id = t.id
    WHERE t.management_token = ${token}::uuid
    GROUP BY t.id, d.display_name, tour.name, tour.start_date
  `

  if (rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(rows[0])
}

export const config: RouteConfig = { path: '/api/manage-team' }
