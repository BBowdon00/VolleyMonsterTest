import type { RouteConfig } from '../../api/_shim'
import { db } from './_lib/db'
import { requireAdmin } from './_lib/admin-auth'

interface CreateTeamBody {
  division_id: string
  name: string
  city?: string | null
  captain_name: string
  captain_email: string
  captain_phone: string
  notes?: string | null
  status?: 'confirmed' | 'pending_payment' | 'waitlisted' | 'cancelled'
  players: Array<{ name: string }>
}

export default async (req: Request): Promise<Response> => {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const url = new URL(req.url)

  if (req.method === 'GET') {
    const slug = url.searchParams.get('tournament_slug')
    if (!slug) return Response.json({ error: 'missing_tournament_slug' }, { status: 400 })

    const rows = await db.sql`
      SELECT
        t.id, t.name, t.city, t.captain_name, t.captain_email, t.captain_phone,
        t.status, t.notes, t.created_at,
        d.id AS division_id, d.display_name AS division_name,
        td.id AS day_id, td.label AS day_label, td.day_date,
        COALESCE(
          jsonb_agg(
            jsonb_build_object('id', p.id, 'name', p.name, 'sort_order', p.sort_order)
            ORDER BY p.sort_order, p.created_at
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::jsonb
        ) AS players
      FROM public.teams t
      JOIN public.divisions d ON d.id = t.division_id
      JOIN public.tournament_days td ON td.id = d.tournament_day_id
      JOIN public.tournaments tour ON tour.id = td.tournament_id
      LEFT JOIN public.players p ON p.team_id = t.id
      WHERE tour.slug = ${slug}
      GROUP BY t.id, d.id, td.id
      ORDER BY td.sort_order, d.sort_order, t.created_at
    `

    return Response.json(rows)
  }

  if (req.method === 'POST') {
    let body: CreateTeamBody
    try {
      body = (await req.json()) as CreateTeamBody
    } catch {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }

    if (!body.division_id || !body.name || !body.captain_name || !body.captain_email) {
      return Response.json({ error: 'missing_required_fields' }, { status: 400 })
    }

    const status = body.status ?? 'confirmed'

    const client = await db.pool.connect()
    try {
      await client.query('BEGIN')

      const teamRes = await client.query<{ id: string }>(
        `INSERT INTO public.teams
           (division_id, name, city, captain_name, captain_email, captain_phone, status, notes)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::team_status, $8)
         RETURNING id`,
        [
          body.division_id,
          body.name.trim(),
          body.city?.trim() || null,
          body.captain_name.trim(),
          body.captain_email.toLowerCase().trim(),
          body.captain_phone.trim(),
          status,
          body.notes?.trim() || null,
        ],
      )
      const teamId = teamRes.rows[0]!.id

      for (let i = 0; i < body.players.length; i++) {
        const p = body.players[i]!
        if (!p.name?.trim()) continue
        await client.query(
          `INSERT INTO public.players (team_id, name, sort_order) VALUES ($1::uuid, $2, $3)`,
          [teamId, p.name.trim(), i],
        )
      }

      await client.query('COMMIT')
      return Response.json({ id: teamId }, { status: 201 })
    } catch (err: unknown) {
      await client.query('ROLLBACK')
      const e = err as { code?: string }
      if (e?.code === '23505') {
        return Response.json(
          {
            error: 'team_name_taken',
            message: 'A team with that name already exists in this division.',
          },
          { status: 409 },
        )
      }
      console.error('[admin-teams] create error', err)
      return Response.json({ error: 'internal' }, { status: 500 })
    } finally {
      client.release()
    }
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    const captainEmail = url.searchParams.get('captain_email')
    if (id) {
      await db.sql`DELETE FROM public.teams WHERE id = ${id}::uuid`
    } else if (captainEmail) {
      await db.sql`DELETE FROM public.teams WHERE captain_email = ${captainEmail.toLowerCase().trim()}`
    } else {
      return Response.json({ error: 'missing_id_or_captain_email' }, { status: 400 })
    }
    return Response.json({ ok: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config: RouteConfig = {
  path: '/api/admin/teams',
  method: ['GET', 'POST', 'DELETE'],
}
