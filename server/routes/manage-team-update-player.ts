import type { RouteConfig } from '../../api/_shim'
import { db } from './_lib/db'

interface UpdateBody {
  token: string
  player_id: string
  new_name: string
  new_jersey_number: string | null
  new_shirt_size: string | null
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const body = (await req.json()) as UpdateBody
  const { token, player_id, new_name, new_jersey_number, new_shirt_size } = body
  if (!token || !player_id || !new_name) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve token → team + tournament date
  const teamRows = await db.sql`
    SELECT t.id AS team_id, tour.start_date
    FROM public.teams t
    JOIN public.divisions d        ON d.id = t.division_id
    JOIN public.tournament_days td ON td.id = d.tournament_day_id
    JOIN public.tournaments tour   ON tour.id = td.tournament_id
    WHERE t.management_token = ${token}::uuid
  `
  if (teamRows.length === 0) return Response.json({ data: false })

  const { team_id, start_date } = teamRows[0] as { team_id: string; start_date: string }

  // Lock edits within 48 hours of tournament
  const tournamentMs = new Date(start_date).getTime()
  const nowMs = Date.now()
  if (tournamentMs - nowMs < FORTY_EIGHT_HOURS_MS) {
    return Response.json(
      { error: 'Edits are locked within 48 hours of the tournament.' },
      { status: 403 },
    )
  }

  const result = await db.sql`
    UPDATE public.players
       SET name          = ${new_name},
           jersey_number = ${new_jersey_number ?? null},
           shirt_size    = ${new_shirt_size ?? null}
     WHERE id = ${player_id}::uuid AND team_id = ${team_id}::uuid
  `
  return Response.json({ data: (result as unknown as { rowCount: number }).rowCount > 0 })
}

export const config: RouteConfig = { path: '/api/manage-team-update-player' }
