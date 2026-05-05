import type { Config } from '@netlify/functions'
import { db } from './_lib/db'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const url = new URL(req.url)
  const code = url.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return Response.json({ valid: false })

  const rows = await db.sql`
    SELECT id, holder_name
    FROM season_passes
    WHERE upper(code) = ${code}
      AND status = 'active'
      AND year = 2026
    LIMIT 1
  `
  const pass = rows[0] as { id: string; holder_name: string | null } | undefined
  if (!pass) return Response.json({ valid: false })

  return Response.json({ valid: true, holder_name: pass.holder_name ?? null })
}

export const config: Config = { path: '/api/validate-pass-code' }
