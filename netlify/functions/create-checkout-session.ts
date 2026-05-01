import type { Config, Context } from '@netlify/functions'
import { orderSubmitSchema } from '../../src/lib/schemas/registration'
import { db } from './_lib/db'
import { stripe } from './_lib/stripe'
import Stripe from 'stripe'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegisterOrderResult {
  order_id: string
  teams: Array<{ team_id: string; division_id: string }>
}

interface RpcTeamEntry {
  division_id: string
  name: string
  fee_cents: number
  players: Array<{
    name: string
    shirt_size: string | null
    jersey_number: string | null
    sort_order: number
  }>
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // 1. Validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = orderSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'validation_error', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { captain, dayEntries } = parsed.data

  // 2. Look up divisions (with their day and tournament) to get prices/labels
  const divisionIds = dayEntries.map((e) => e.divisionId)

  const divRows = await db.sql`
    SELECT
      d.id, d.tournament_day_id, d.skill_level, d.gender, d.display_name,
      d.fee_cents, d.max_teams, d.format, d.team_size, d.sort_order,
      d.created_at, d.updated_at,
      td.day_date, td.label AS day_label,
      t.name AS tournament_name, t.slug AS tournament_slug
    FROM divisions d
    JOIN tournament_days td ON td.id = d.tournament_day_id
    JOIN tournaments t ON t.id = td.tournament_id
    WHERE d.id = ANY(${divisionIds}::uuid[])
  `

  if (!divRows || divRows.length !== divisionIds.length) {
    return Response.json(
      { error: 'validation_error', message: 'One or more divisions not found' },
      { status: 400 },
    )
  }

  // Build a map for quick access
  const divisionMap = new Map<string, Record<string, unknown>>()
  for (const row of divRows as Record<string, unknown>[]) {
    divisionMap.set(row['id'] as string, row)
  }

  // 3. Build RPC payload and compute total
  const rpcTeams: RpcTeamEntry[] = []
  let totalCents = 0

  for (const entry of dayEntries) {
    const division = divisionMap.get(entry.divisionId)
    if (!division) {
      return Response.json(
        { error: 'validation_error', message: 'Division not found' },
        { status: 400 },
      )
    }

    // Enforce exact team size required by the division's format
    if (entry.players.length !== division['team_size']) {
      return Response.json(
        {
          error: 'validation_error',
          message: `Division requires exactly ${division['team_size']} players`,
        },
        { status: 400 },
      )
    }

    totalCents += division['fee_cents'] as number

    rpcTeams.push({
      division_id: entry.divisionId,
      name: entry.teamName,
      fee_cents: division['fee_cents'] as number,
      players: entry.players.map((p, idx) => ({
        name: p.name,
        shirt_size: null,
        jersey_number: null,
        sort_order: idx,
      })),
    })
  }

  // 4. Transactional order creation
  let orderResult: RegisterOrderResult
  const client = await db.pool.connect()
  try {
    await client.query('BEGIN')

    const orderRes = await client.query<{ id: string }>(
      `INSERT INTO public.registration_orders (captain_email, total_cents, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [captain.email.toLowerCase().trim(), totalCents],
    )
    const orderId = orderRes.rows[0]!.id
    const teams: RegisterOrderResult['teams'] = []

    for (const entry of rpcTeams) {
      const teamRes = await client.query<{ id: string }>(
        `INSERT INTO public.teams (division_id, name, city, captain_name, captain_email, captain_phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending_payment') RETURNING id`,
        [
          entry.division_id,
          entry.name,
          captain.city?.trim() || null,
          captain.name,
          captain.email.toLowerCase().trim(),
          captain.phone,
        ],
      )
      const teamId = teamRes.rows[0]!.id

      for (const p of entry.players) {
        await client.query(
          `INSERT INTO public.players (team_id, name, shirt_size, jersey_number, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [teamId, p.name, p.shirt_size || null, p.jersey_number || null, p.sort_order],
        )
      }

      await client.query(
        `INSERT INTO public.registrations (order_id, team_id, amount_cents) VALUES ($1, $2, $3)`,
        [orderId, teamId, entry.fee_cents],
      )

      teams.push({ team_id: teamId, division_id: entry.division_id })
    }

    await client.query('COMMIT')
    orderResult = { order_id: orderId, teams }
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    const e = err as { code?: string }
    if (e?.code === '23505') {
      return Response.json(
        { error: 'team_name_taken', message: 'That team name is already taken — try another?' },
        { status: 409 },
      )
    }
    console.error('[create-checkout-session] order creation error', err)
    return Response.json({ error: 'internal' }, { status: 500 })
  } finally {
    client.release()
  }

  const orderId = orderResult.order_id

  // 5. Build Stripe line items
  const siteUrl = process.env.PUBLIC_SITE_URL ?? ''

  const lineItems: Array<{
    price_data: {
      currency: string
      unit_amount: number
      product_data: { name: string }
    }
    quantity: number
  }> = dayEntries.map((entry) => {
    const division = divisionMap.get(entry.divisionId)!
    const tournamentName = division['tournament_name'] as string
    const dayLabel = (division['day_label'] as string | null) ?? (division['day_date'] as string)
    const divisionName = division['display_name'] as string

    return {
      price_data: {
        currency: 'usd',
        unit_amount: division['fee_cents'] as number,
        product_data: {
          name: `${tournamentName} — ${dayLabel} — ${divisionName}`,
        },
      },
      quantity: 1,
    }
  })

  // 6. Create Stripe Checkout Session
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      metadata: { order_id: orderId },
      success_url: `${siteUrl}/registration/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/registration/cancelled`,
    })
  } catch (stripeErr) {
    console.error('[create-checkout-session] Stripe session creation error', stripeErr)
    return Response.json({ error: 'internal' }, { status: 500 })
  }

  // 7. Persist stripe_checkout_session_id on the order
  await db.sql`UPDATE registration_orders SET stripe_checkout_session_id = ${session.id} WHERE id = ${orderId}`

  // 8. Return checkout URL to the client
  return Response.json({ url: session.url, order_id: orderId })
}

export const config: Config = { path: '/api/create-checkout-session' }
