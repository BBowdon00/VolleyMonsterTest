import type { Config } from '@netlify/functions'
import { db } from './_lib/db'

interface UpdateBody {
  token: string
  player_id: string
  new_name: string
  new_jersey_number: string | null
  new_shirt_size: string | null
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const body = (await req.json()) as UpdateBody
  const { token, player_id, new_name, new_jersey_number, new_shirt_size } = body
  if (!token || !player_id || !new_name) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const rows = await db.sql`
    SELECT public.manage_team_update_player(
      ${token}::uuid,
      ${player_id}::uuid,
      ${new_name},
      ${new_jersey_number ?? null},
      ${new_shirt_size ?? null}
    ) AS result
  `
  const result = (rows[0] as { result: boolean }).result
  return Response.json({ data: result })
}

export const config: Config = { path: '/api/manage-team-update-player' }
