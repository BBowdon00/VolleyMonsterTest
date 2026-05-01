import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Database, Json } from '../src/lib/database.types'
import { orderSubmitSchema } from '../src/lib/schemas/registration'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { stripe } from './_lib/stripe'

// ---------------------------------------------------------------------------
// Rate limiting — simple in-memory IP bucket (resets on cold start; v1 only)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const hits = (rateLimitMap.get(ip) ?? []).filter((t) => t > windowStart)
  hits.push(now)
  rateLimitMap.set(ip, hits)
  return hits.length > RATE_LIMIT_MAX
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TournamentDayRow = Database['public']['Tables']['tournament_days']['Row']
type DivisionRow = Database['public']['Tables']['divisions']['Row']
type TournamentRow = Database['public']['Tables']['tournaments']['Row']

interface DivisionWithDay extends DivisionRow {
  tournament_days: TournamentDayRow & {
    tournaments: TournamentRow
  }
}

/** Shape returned by the register_order RPC */
interface RegisterOrderResult {
  order_id: string
  teams: Array<{ team_id: string; division_id: string }>
}

/** One team entry passed to the RPC */
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Method guard
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  // Rate limiting
  const forwarded = req.headers['x-forwarded-for']
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ?? 'unknown'

  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'rate_limited', message: 'Too many requests — try again later' })
    return
  }

  // ---------------------------------------------------------------------------
  // 1. Validate request body
  // ---------------------------------------------------------------------------
  const parsed = orderSubmitSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.issues })
    return
  }

  const { captain, dayEntries } = parsed.data

  // ---------------------------------------------------------------------------
  // 2. Look up divisions (with their day and tournament) to get prices/labels
  // ---------------------------------------------------------------------------
  const divisionIds = dayEntries.map((e) => e.divisionId)

  const { data: divisionRows, error: divisionError } = await supabaseAdmin
    .from('divisions')
    .select(
      `
      id,
      tournament_day_id,
      skill_level,
      gender,
      display_name,
      fee_cents,
      max_teams,
      format,
      team_size,
      sort_order,
      created_at,
      updated_at,
      tournament_days (
        id,
        tournament_id,
        day_date,
        label,
        description_md,
        check_in_time,
        start_time,
        sort_order,
        created_at,
        updated_at,
        tournaments (
          id,
          slug,
          name,
          description_md,
          hero_image_url,
          location_name,
          location_city,
          location_state,
          location_address,
          start_date,
          end_date,
          registration_opens_at,
          registration_closes_at,
          status,
          created_at,
          updated_at
        )
      )
    `,
    )
    .in('id', divisionIds)

  if (divisionError) {
    console.error('[create-checkout-session] division lookup error', divisionError)
    res.status(500).json({ error: 'internal' })
    return
  }

  if (!divisionRows || divisionRows.length !== divisionIds.length) {
    res.status(400).json({ error: 'validation_error', message: 'One or more divisions not found' })
    return
  }

  // Build a map for quick access
  const divisionMap = new Map<string, DivisionWithDay>()
  for (const row of divisionRows as unknown as DivisionWithDay[]) {
    divisionMap.set(row.id, row)
  }

  // ---------------------------------------------------------------------------
  // 3. Build RPC payload and compute total
  // ---------------------------------------------------------------------------
  const rpcTeams: RpcTeamEntry[] = []
  let totalCents = 0

  for (const entry of dayEntries) {
    const division = divisionMap.get(entry.divisionId)
    if (!division) {
      res.status(400).json({ error: 'validation_error', message: 'Division not found' })
      return
    }

    // Enforce exact team size required by the division's format
    if (entry.players.length !== division.team_size) {
      res.status(400).json({
        error: 'validation_error',
        message: `Division requires exactly ${division.team_size} players`,
      })
      return
    }

    totalCents += division.fee_cents

    rpcTeams.push({
      division_id: entry.divisionId,
      name: entry.teamName,
      fee_cents: division.fee_cents,
      players: entry.players.map((p, idx) => ({
        name: p.name,
        shirt_size: null,
        jersey_number: null,
        sort_order: idx,
      })),
    })
  }

  // ---------------------------------------------------------------------------
  // 4. Call register_order RPC (transactional)
  // ---------------------------------------------------------------------------
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('register_order', {
    p_captain_email: captain.email,
    p_captain_name: captain.name,
    p_captain_phone: captain.phone,
    p_captain_city: captain.city,
    p_total_cents: totalCents,
    p_teams: rpcTeams as unknown as Json,
  })

  if (rpcError) {
    // Postgres unique violation on team name (division_id, name)
    if (rpcError.code === '23505') {
      res.status(409).json({
        error: 'team_name_taken',
        message: 'That team name is already taken — try another?',
      })
      return
    }
    console.error('[create-checkout-session] register_order RPC error', rpcError)
    res.status(500).json({ error: 'internal' })
    return
  }

  const orderResult = rpcData as RegisterOrderResult
  const orderId = orderResult.order_id

  // ---------------------------------------------------------------------------
  // 4b. Stripe bypass for local/dev testing (STRIPE_BYPASS=true)
  // ---------------------------------------------------------------------------
  if (process.env.STRIPE_BYPASS === 'true') {
    const fakeSessionId = `dev_bypass_${orderId}`
    const siteUrlBypass = process.env.PUBLIC_SITE_URL ?? ''

    // Mark order as paid with a fake session ID
    await supabaseAdmin
      .from('registration_orders')
      .update({
        status: 'paid',
        stripe_checkout_session_id: fakeSessionId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    // Confirm all teams in this order
    const teamIds = orderResult.teams.map((t) => t.team_id)
    await supabaseAdmin.from('teams').update({ status: 'confirmed' }).in('id', teamIds)

    // Insert a fake payment record
    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      stripe_payment_intent_id: `pi_bypass_${orderId}`,
      stripe_charge_id: `ch_bypass_${orderId}`,
      amount_cents: totalCents,
      currency: 'usd',
      status: 'succeeded',
      refunded_amount_cents: 0,
    })

    res
      .status(200)
      .json({
        url: `${siteUrlBypass}/registration/success?session_id=${fakeSessionId}`,
        order_id: orderId,
      })
    return
  }

  // ---------------------------------------------------------------------------
  // 5. Build Stripe line items
  // ---------------------------------------------------------------------------
  const siteUrl = process.env.PUBLIC_SITE_URL ?? ''

  const lineItems: Array<{
    price_data: {
      currency: string
      unit_amount: number
      product_data: { name: string }
    }
    quantity: number
  }> = dayEntries.map((entry) => {
    const division = divisionMap.get(entry.divisionId) as DivisionWithDay
    const tournamentName = division.tournament_days.tournaments.name
    const dayLabel = division.tournament_days.label ?? division.tournament_days.day_date
    const divisionName = division.display_name

    return {
      price_data: {
        currency: 'usd',
        unit_amount: division.fee_cents,
        product_data: {
          name: `${tournamentName} — ${dayLabel} — ${divisionName}`,
        },
      },
      quantity: 1,
    }
  })

  // ---------------------------------------------------------------------------
  // 6. Create Stripe Checkout Session
  // ---------------------------------------------------------------------------
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>
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
    res.status(500).json({ error: 'internal' })
    return
  }

  // ---------------------------------------------------------------------------
  // 7. Persist stripe_checkout_session_id on the order
  // ---------------------------------------------------------------------------
  const { error: updateError } = await supabaseAdmin
    .from('registration_orders')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', orderId)

  if (updateError) {
    // Non-fatal: the order exists; Stripe webhook will handle status update.
    // Log it but don't fail the request.
    console.error('[create-checkout-session] failed to update order with session id', updateError)
  }

  // ---------------------------------------------------------------------------
  // 8. Return checkout URL to the client
  // ---------------------------------------------------------------------------
  res.status(200).json({ url: session.url, order_id: orderId })
}
