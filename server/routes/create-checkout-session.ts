import type { RouteConfig } from '../../api/_shim'
import type { Context } from '../../api/_shim'
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
  original_fee_cents: number
  adjusted_fee_cents: number
  discount_cents: number
  pass_codes: string[]
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

export default async (req: Request, context: Context): Promise<Response> => {
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

  // 2. Look up divisions
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

  const divisionMap = new Map<string, Record<string, unknown>>()
  for (const row of divRows as Record<string, unknown>[]) {
    divisionMap.set(row['id'] as string, row)
  }

  // 3. Validate pass codes
  const allSubmittedCodes = dayEntries.flatMap((entry) =>
    entry.players
      .map((p) => p.passCode?.trim().toUpperCase())
      .filter((c): c is string => Boolean(c)),
  )
  const uniqueSubmittedCodes = [...new Set(allSubmittedCodes)]

  const validPassMap = new Map<string, string>() // upper(code) -> pass_id

  if (uniqueSubmittedCodes.length > 0) {
    const validPasses = await db.sql`
      SELECT id, upper(code) AS code
      FROM season_passes
      WHERE upper(code) = ANY(${uniqueSubmittedCodes}::text[])
        AND status = 'active'
        AND year = 2026
    `
    for (const p of validPasses as { id: string; code: string }[]) {
      validPassMap.set(p.code, p.id)
    }

    const invalidCodes = uniqueSubmittedCodes.filter((c) => !validPassMap.has(c))
    if (invalidCodes.length > 0) {
      return Response.json({ error: 'invalid_pass_codes', codes: invalidCodes }, { status: 400 })
    }
  }

  // 4. Build team entries and compute totals with discounts
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

    if (entry.players.length !== division['team_size']) {
      return Response.json(
        {
          error: 'validation_error',
          message: `Division requires exactly ${division['team_size']} players`,
        },
        { status: 400 },
      )
    }

    const feeCents = division['fee_cents'] as number
    const teamSize = division['team_size'] as number
    const isOpen = division['skill_level'] === 'Open'

    // Deduplicate codes within this team; passes don't apply to Open division
    const teamCodes = isOpen
      ? []
      : [
          ...new Set(
            entry.players
              .map((p) => p.passCode?.trim().toUpperCase())
              .filter((c): c is string => typeof c === 'string' && validPassMap.has(c)),
          ),
        ]

    const discountCents = Math.min(Math.floor((feeCents * teamCodes.length) / teamSize), feeCents)
    const adjustedFee = feeCents - discountCents

    totalCents += adjustedFee

    rpcTeams.push({
      division_id: entry.divisionId,
      name: entry.teamName,
      original_fee_cents: feeCents,
      adjusted_fee_cents: adjustedFee,
      discount_cents: discountCents,
      pass_codes: teamCodes,
      players: entry.players.map((p, idx) => ({
        name: p.name,
        shirt_size: null,
        jersey_number: null,
        sort_order: idx,
      })),
    })
  }

  // 5. Transactional order + team creation
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
      await client.query(
        `DELETE FROM public.teams
         WHERE division_id = $1::uuid
           AND lower(name) = lower($2)
           AND status = 'pending_payment'
           AND lower(captain_email) = lower($3)`,
        [entry.division_id, entry.name, captain.email],
      )

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
        [orderId, teamId, entry.adjusted_fee_cents],
      )

      // Record season pass uses for this team
      if (entry.pass_codes.length > 0) {
        const perPassDiscount = Math.floor(
          entry.original_fee_cents / (divisionMap.get(entry.division_id)!['team_size'] as number),
        )
        for (const code of entry.pass_codes) {
          const passId = validPassMap.get(code)!
          await client.query(
            `INSERT INTO public.season_pass_uses (pass_id, team_id, discount_cents) VALUES ($1::uuid, $2::uuid, $3)`,
            [passId, teamId, perPassDiscount],
          )
        }
      }

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

  // 6. Free order: confirm immediately, no Stripe needed
  if (totalCents === 0) {
    try {
      await db.sql`UPDATE registration_orders SET status = 'paid', paid_at = NOW() WHERE id = ${orderId}`
      const teamIds = orderResult.teams.map((t) => t.team_id)
      await db.sql`UPDATE teams SET status = 'confirmed' WHERE id = ANY(${teamIds}::uuid[])`
    } catch (err) {
      console.error('[create-checkout-session] free order confirm error', err)
      return Response.json({ error: 'internal' }, { status: 500 })
    }

    const siteUrl = process.env.PUBLIC_SITE_URL ?? ''
    if (siteUrl) {
      context.waitUntil(
        fetch(`${siteUrl}/api/send-confirmation-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
        }).catch((err) => console.error('Email trigger failed:', err)),
      )
    }

    return Response.json({ free: true, order_id: orderId })
  }

  // 7. Build Stripe line items (exclude $0 items — Stripe requires positive unit_amount)
  const siteUrl = process.env.PUBLIC_SITE_URL ?? ''

  const lineItems: Array<{
    price_data: {
      currency: string
      unit_amount: number
      product_data: { name: string }
    }
    quantity: number
  }> = rpcTeams
    .filter((entry) => entry.adjusted_fee_cents > 0)
    .map((entry) => {
      const division = divisionMap.get(entry.division_id)!
      const tournamentName = division['tournament_name'] as string
      const dayLabel = (division['day_label'] as string | null) ?? (division['day_date'] as string)
      const divisionName = division['display_name'] as string
      const discountNote = entry.discount_cents > 0 ? ' (season pass applied)' : ''

      return {
        price_data: {
          currency: 'usd',
          unit_amount: entry.adjusted_fee_cents,
          product_data: {
            name: `${tournamentName} — ${dayLabel} — ${divisionName}${discountNote}`,
          },
        },
        quantity: 1,
      }
    })

  // 8. Create Stripe Checkout Session
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

  // 9. Persist stripe_checkout_session_id on the order
  await db.sql`UPDATE registration_orders SET stripe_checkout_session_id = ${session.id} WHERE id = ${orderId}`

  return Response.json({ url: session.url, order_id: orderId })
}

export const config: RouteConfig = { path: '/api/create-checkout-session' }
