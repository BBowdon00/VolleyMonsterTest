import type { Config, Context } from '@netlify/functions'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { db } from './_lib/db'

// Dev-only seed endpoint. Reads netlify/database/seed-dev.sql and executes it
// in a single multi-statement query against the local Netlify dev database.
// Blocked in production via context.deploy.context.

export default async (_req: Request, context: Context): Promise<Response> => {
  if (context.deploy.context !== 'dev') {
    return new Response('Forbidden outside local dev', { status: 403 })
  }

  const sqlPath = path.join(process.cwd(), 'netlify', 'database', 'seed-dev.sql')
  const sql = await readFile(sqlPath, 'utf8')

  const client = await db.pool.connect()
  try {
    await client.query(sql)
  } finally {
    client.release()
  }

  const teamsRes = await db.sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM public.teams
    WHERE captain_email LIKE '%@test.vm'
  `
  const playersRes = await db.sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM public.players p
    JOIN public.teams t ON t.id = p.team_id
    WHERE t.captain_email LIKE '%@test.vm'
  `

  return Response.json({
    ok: true,
    teams: Number(teamsRes[0]?.count ?? 0),
    players: Number(playersRes[0]?.count ?? 0),
  })
}

export const config: Config = {
  path: '/api/seed-dev',
  method: 'POST',
}
