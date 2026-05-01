import type { Config } from '@netlify/functions'
import { db } from './_lib/db'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const rows = await db.sql`SELECT * FROM public.manage_team_lookup(${token}::uuid)`
  if (rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(rows[0])
}

export const config: Config = { path: '/api/manage-team' }
