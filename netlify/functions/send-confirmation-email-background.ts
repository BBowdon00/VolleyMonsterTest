import type { Config } from '@netlify/functions'
import { db } from './_lib/db'
import { requireAdmin } from './_lib/admin-auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerRow {
  name: string
  jersey_number: string | null
  shirt_size: string | null
  sort_order: number
}

interface TeamRow {
  team_id: string
  team_name: string
  division_name: string
  day_label: string
  tournament_date: string
  fee_cents: number
  management_token: string
  players: PlayerRow[]
}

interface OrderData {
  captain_email: string
  captain_name: string
  total_cents: number
  tournament_name: string
  venue_name: string
  venue_city: string
  venue_state: string
  teams: TeamRow[]
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchOrderData(orderId: string): Promise<OrderData | null> {
  // Fetch the order itself
  const orderRows = await db.sql`
    SELECT id, captain_email, total_cents
    FROM registration_orders
    WHERE id = ${orderId}
    LIMIT 1
  `
  const order = orderRows[0] as
    | { id: string; captain_email: string; total_cents: number }
    | undefined
  if (!order) return null

  // Fetch all registrations for this order with full team/division/day/tournament chain
  const regRows = await db.sql`
    SELECT
      r.amount_cents,
      t.id             AS team_id,
      t.name           AS team_name,
      t.captain_name,
      t.management_token,
      d.display_name   AS division_name,
      td.label         AS day_label,
      td.day_date,
      tour.name        AS tournament_name,
      tour.location_name,
      tour.location_city,
      tour.location_state
    FROM registrations r
    JOIN teams t         ON t.id = r.team_id
    JOIN divisions d     ON d.id = t.division_id
    JOIN tournament_days td ON td.id = d.tournament_day_id
    JOIN tournaments tour   ON tour.id = td.tournament_id
    WHERE r.order_id = ${orderId}
    ORDER BY t.id
  `

  if (!regRows || regRows.length === 0) return null

  type RegRow = {
    amount_cents: number
    team_id: string
    team_name: string
    captain_name: string
    management_token: string
    division_name: string
    day_label: string | null
    day_date: string
    tournament_name: string
    location_name: string | null
    location_city: string | null
    location_state: string | null
  }

  const typedRows = regRows as RegRow[]
  const firstRow = typedRows[0]!

  // Fetch players for all teams in this order
  const teamIds = typedRows.map((r) => r.team_id)
  const playerRows = await db.sql`
    SELECT team_id, id, name, jersey_number, shirt_size, sort_order
    FROM players
    WHERE team_id = ANY(${teamIds}::uuid[])
    ORDER BY team_id, sort_order, created_at
  `

  type PRow = {
    team_id: string
    id: string
    name: string
    jersey_number: string | null
    shirt_size: string | null
    sort_order: number
  }

  // Group players by team_id
  const playersByTeam = new Map<string, PlayerRow[]>()
  for (const p of playerRows as PRow[]) {
    if (!playersByTeam.has(p.team_id)) {
      playersByTeam.set(p.team_id, [])
    }
    playersByTeam.get(p.team_id)!.push({
      name: p.name,
      jersey_number: p.jersey_number,
      shirt_size: p.shirt_size,
      sort_order: p.sort_order,
    })
  }

  const teams: TeamRow[] = typedRows.map((reg) => ({
    team_id: reg.team_id,
    team_name: reg.team_name,
    division_name: reg.division_name,
    day_label: reg.day_label ?? reg.day_date,
    tournament_date: reg.day_date,
    fee_cents: reg.amount_cents,
    management_token: reg.management_token,
    players: playersByTeam.get(reg.team_id) ?? [],
  }))

  return {
    captain_email: order.captain_email,
    captain_name: firstRow.captain_name,
    total_cents: order.total_cents,
    tournament_name: firstRow.tournament_name,
    venue_name: firstRow.location_name ?? '',
    venue_city: firstRow.location_city ?? '',
    venue_state: firstRow.location_state ?? '',
    teams,
  }
}

// ---------------------------------------------------------------------------
// Email HTML builder
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  // dateStr is 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildPlayerRows(players: PlayerRow[]): string {
  if (players.length === 0) {
    return '<tr><td style="padding:4px 0;color:#6b7280;font-style:italic;">No players listed</td></tr>'
  }
  return players
    .map((p) => {
      const extras: string[] = []
      if (p.jersey_number) extras.push(`#${p.jersey_number}`)
      if (p.shirt_size) extras.push(p.shirt_size)
      const suffix =
        extras.length > 0 ? ` <span style="color:#9ca3af;">(${extras.join(', ')})</span>` : ''
      return `<tr><td style="padding:2px 0;font-size:14px;color:#374151;">${p.name}${suffix}</td></tr>`
    })
    .join('')
}

function buildTeamSection(team: TeamRow, siteUrl: string): string {
  const manageUrl = `${siteUrl}/manage/${team.management_token}`
  return `
    <div style="margin-bottom:28px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#7EBEC5;padding:14px 20px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#fff;">${team.team_name}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#e0f4f6;">${team.division_name} &mdash; ${team.day_label}</p>
      </div>
      <div style="padding:16px 20px;background:#fff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tbody>
            ${buildPlayerRows(team.players)}
          </tbody>
        </table>
        <p style="margin:0;font-size:13px;color:#6b7280;">Entry fee: <strong style="color:#374151;">${formatCents(team.fee_cents)}</strong></p>
        <p style="margin:10px 0 0;">
          <a href="${manageUrl}"
             style="display:inline-block;padding:8px 18px;background:#7EBEC5;color:#fff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px;">
            Manage roster
          </a>
        </p>
      </div>
    </div>
  `
}

function buildEmailHtml(data: OrderData, siteUrl: string): string {
  const teamSections = data.teams.map((t) => buildTeamSection(t, siteUrl)).join('')
  const venueDisplay = [data.venue_name, data.venue_city, data.venue_state]
    .filter(Boolean)
    .join(', ')

  // Use the first team's tournament_date for the header display
  const displayDate = data.teams[0]?.tournament_date
    ? formatDate(data.teams[0].tournament_date)
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're registered!</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#7EBEC5;padding:32px 32px 24px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:2px;color:#e0f4f6;text-transform:uppercase;">Volley Monster</p>
              <h1 style="margin:8px 0 0;font-size:28px;font-weight:800;color:#fff;">You&rsquo;re in!</h1>
            </td>
          </tr>

          <!-- Tournament info -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <h2 style="margin:0;font-size:20px;font-weight:700;color:#111827;">${data.tournament_name}</h2>
              ${venueDisplay ? `<p style="margin:6px 0 0;font-size:14px;color:#6b7280;">${venueDisplay}</p>` : ''}
              ${displayDate ? `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${displayDate}</p>` : ''}
            </td>
          </tr>

          <!-- Teams -->
          <tr>
            <td style="padding:20px 32px 4px;">
              <h3 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;">Your Teams</h3>
              ${teamSections}
            </td>
          </tr>

          <!-- Order total -->
          <tr>
            <td style="padding:4px 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:4px;">
                <tr>
                  <td style="font-size:15px;font-weight:700;color:#111827;">Order total</td>
                  <td align="right" style="font-size:15px;font-weight:700;color:#111827;">${formatCents(data.total_cents)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">
                Questions? Email us at
                <a href="mailto:info@volleymonster.com" style="color:#7EBEC5;text-decoration:none;">info@volleymonster.com</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#d1d5db;">&copy; ${new Date().getFullYear()} Volley Monster. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const authError = requireAdmin(req)
  if (authError) return authError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const orderId = (body as { order_id?: string })?.order_id
  if (!orderId) {
    return Response.json({ error: 'order_id is required' }, { status: 400 })
  }

  const orderData = await fetchOrderData(orderId)
  if (!orderData) {
    return Response.json({ error: 'Order not found' }, { status: 404 })
  }

  const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://volleymonster.com'
  const captainEmail = orderData.captain_email
  const teamNames = orderData.teams.map((t) => t.team_name)
  const subject = `You're in! ${orderData.tournament_name} — ${teamNames.join(', ')}`
  const html = buildEmailHtml(orderData, siteUrl)

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'info@volleymonster.com',
        to: [captainEmail],
        subject,
        html,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error('[send-confirmation-email] Resend error', emailRes.status, errText)
    }
  } catch (err) {
    console.error('[send-confirmation-email] Failed to send email:', err)
    // Fire-and-forget: don't propagate the error to the caller
  }

  return Response.json({ ok: true })
}

export const config: Config = { path: '/api/send-confirmation-email' }
