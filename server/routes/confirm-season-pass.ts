import type { RouteConfig } from '../../api/_shim'
import { db } from './_lib/db'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId) return Response.json({ error: 'Missing session_id' }, { status: 400 })

  const rows = await db.sql`
    SELECT id, code, status, holder_name
    FROM season_passes
    WHERE stripe_checkout_session_id = ${sessionId}
    LIMIT 1
  `
  const pass = rows[0] as
    | { id: string; code: string; status: string; holder_name: string | null }
    | undefined

  if (!pass) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    status: pass.status,
    code: pass.status === 'active' ? pass.code : null,
    holder_name: pass.holder_name,
  })
}

export const config: RouteConfig = { path: '/api/confirm-season-pass' }
