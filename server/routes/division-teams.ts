import type { RouteConfig } from '../../api/_shim'
import { db } from './_lib/db'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const divisionId = new URL(req.url).searchParams.get('division_id')
  if (!divisionId) return Response.json({ error: 'Missing division_id' }, { status: 400 })

  const teams = await db.sql`
    SELECT
      tp.id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('name', p.name)
          ORDER BY p.sort_order, p.created_at
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::jsonb
      ) AS players
    FROM public.teams_public tp
    LEFT JOIN public.players p ON p.team_id = tp.id
    WHERE tp.division_id = ${divisionId}::uuid
    GROUP BY tp.id, tp.created_at
    ORDER BY tp.created_at ASC
  `

  return Response.json(teams, {
    headers: {
      'Netlify-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Netlify-Cache-ID': `division-teams,division-${divisionId}`,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}

export const config: RouteConfig = { path: '/api/division-teams' }
