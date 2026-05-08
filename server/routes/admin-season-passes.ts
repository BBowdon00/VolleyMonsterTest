import type { RouteConfig } from '../../api/_shim'
import { randomBytes } from 'crypto'
import { db } from './_lib/db'
import { requireAdmin } from './_lib/admin-auth'

const PASS_YEAR = 2026

function generatePassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(12)
  return `VM${PASS_YEAR}-${Array.from(bytes, (b) => chars[b % chars.length]).join('')}`
}

export default async (req: Request): Promise<Response> => {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const url = new URL(req.url)

  if (req.method === 'GET') {
    const rows = await db.sql`
      SELECT
        sp.id,
        sp.code,
        sp.holder_name,
        sp.holder_email,
        sp.year,
        sp.status,
        sp.stripe_checkout_session_id,
        sp.created_at,
        COUNT(spu.id)::int AS use_count
      FROM season_passes sp
      LEFT JOIN season_pass_uses spu ON spu.pass_id = sp.id
      GROUP BY sp.id
      ORDER BY sp.created_at DESC
    `
    return Response.json(rows)
  }

  if (req.method === 'POST') {
    let body: { name?: string; email?: string }
    try {
      body = (await req.json()) as { name?: string; email?: string }
    } catch {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }

    let code = generatePassCode()
    for (;;) {
      const existing =
        await db.sql`SELECT id FROM season_passes WHERE upper(code) = upper(${code}) LIMIT 1`
      if ((existing as unknown[]).length === 0) break
      code = generatePassCode()
    }

    const rows = await db.sql`
      INSERT INTO public.season_passes (code, holder_name, holder_email, year, status)
      VALUES (${code}, ${body.name ?? null}, ${body.email ?? null}, ${PASS_YEAR}, 'active')
      RETURNING id, code, holder_name, holder_email, year, status, created_at
    `
    return Response.json(rows[0], { status: 201 })
  }

  if (req.method === 'PATCH') {
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'missing_id' }, { status: 400 })
    await db.sql`UPDATE season_passes SET status = 'cancelled' WHERE id = ${id}::uuid`
    return Response.json({ ok: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config: RouteConfig = {
  path: '/api/admin/season-passes',
  method: ['GET', 'POST', 'PATCH'],
}
