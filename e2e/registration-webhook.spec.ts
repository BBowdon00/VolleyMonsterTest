import { test, expect, type APIRequestContext } from '@playwright/test'
import { buildSignedWebhook, readWebhookSecret } from './helpers/stripe'
import { createCheckoutSession } from './helpers/registration'
import { deleteTeamsByEmail, getTeamStatus, getOrderStatus, withDb } from './helpers/db'

const GENDER_LABELS: Record<string, string> = {
  mens: "Men's",
  womens: "Women's",
  coed: 'Coed',
  boys: 'Boys',
  girls: 'Girls',
}

async function getDivisionContext(
  divisionId: string,
  request: APIRequestContext,
): Promise<{ genderLabel: string | null; dayLabel: string | null }> {
  const res = await request.get('/api/tournament?slug=season-opener-2026')
  if (!res.ok()) return { genderLabel: null, dayLabel: null }
  const data = (await res.json()) as {
    tournament_days: Array<{
      label: string | null
      day_date: string
      divisions: Array<{ id: string; gender: string }>
    }>
  }
  for (const day of data.tournament_days) {
    const div = day.divisions.find((d) => d.id === divisionId)
    if (div) {
      return {
        genderLabel: GENDER_LABELS[div.gender] ?? null,
        // The page renders `day.label || format(day.day_date, 'EEEE, MMM d')`
        // — TournamentDetailPage.tsx:164. Use the same precedence here.
        dayLabel:
          day.label ??
          new Date(day.day_date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
          }),
      }
    }
  }
  return { genderLabel: null, dayLabel: null }
}

// Webhook-driven E2E: skip the Stripe-hosted UI and forge a signed webhook
// using the dev `stripe listen` signing secret. Faster and deterministic
// compared to the full Checkout UI test in registration-full.spec.ts.

const CAPTAIN_EMAIL = 'webhook-e2e@test.vm'
const TEAM_NAME = 'Webhook Test / E2E'

test.describe('registration → webhook → confirmed', () => {
  test.beforeEach(async () => {
    await deleteTeamsByEmail(CAPTAIN_EMAIL)
  })
  test.afterAll(async () => {
    await deleteTeamsByEmail(CAPTAIN_EMAIL)
  })

  test('signed checkout.session.completed flips team to confirmed and team appears on division page', async ({
    request,
    page,
  }) => {
    // Pick a non-Open division with the smallest team_size to keep input small.
    const tournamentRes = await request.get('/api/tournament?slug=season-opener-2026')
    expect(tournamentRes.ok()).toBeTruthy()
    const tournament = (await tournamentRes.json()) as {
      tournament_days: Array<{
        id: string
        divisions: Array<{ id: string; skill_level: string; team_size: number }>
      }>
    }
    const day = tournament.tournament_days[0]
    const div = day.divisions
      .filter((d) => d.skill_level !== 'Open')
      .sort((a, b) => a.team_size - b.team_size)[0]
    expect(div).toBeDefined()

    const players = Array.from({ length: div.team_size }, (_, i) => `Webhook Player ${i + 1}`)

    // 1. Create the order (pending_payment, real Stripe session)
    const { status, body } = await createCheckoutSession(request, {
      captainEmail: CAPTAIN_EMAIL,
      divisionId: div.id,
      tournamentDayId: day.id,
      players,
      teamName: TEAM_NAME,
    })
    expect(status).toBe(200)
    const order = body as { url?: string; order_id: string }
    expect(order.order_id).toBeTruthy()

    // Resolve the team_id and stripe session_id we just created
    const { teamId, sessionId } = await withDb(async (c) => {
      const r = await c.query<{ team_id: string; stripe_session: string }>(
        `SELECT r.team_id, ro.stripe_checkout_session_id AS stripe_session
         FROM registration_orders ro
         JOIN registrations r ON r.order_id = ro.id
         WHERE ro.id = $1`,
        [order.order_id],
      )
      return { teamId: r.rows[0].team_id, sessionId: r.rows[0].stripe_session }
    })
    expect(await getTeamStatus(teamId)).toBe('pending_payment')

    // 2. Forge a signed checkout.session.completed and POST it
    const { rawBody, signature } = buildSignedWebhook({
      type: 'checkout.session.completed',
      sessionId,
      metadata: { order_id: order.order_id },
      amountTotal: 100,
      webhookSecret: readWebhookSecret(),
    })
    const webhookRes = await request.post('/api/stripe-webhook', {
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json',
      },
      data: rawBody,
    })
    expect(webhookRes.status()).toBe(200)

    // 3. Database side-effects: team confirmed, order paid
    expect(await getTeamStatus(teamId)).toBe('confirmed')
    expect(await getOrderStatus(order.order_id)).toBe('paid')

    // 4. Replay protection: same event id is idempotent (won't fail)
    const replay = await request.post('/api/stripe-webhook', {
      headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
      data: rawBody,
    })
    expect(replay.status()).toBe(200)

    // 5. The team appears on the public division-teams listing
    const teamsRes = await request.get(`/api/division-teams?division_id=${div.id}`)
    expect(teamsRes.ok()).toBeTruthy()
    const teams = (await teamsRes.json()) as Array<{ id: string; players: { name: string }[] }>
    const ours = teams.find((t) => t.id === teamId)
    expect(ours).toBeDefined()
    expect(ours!.players.map((p) => p.name)).toEqual(players)

    // 6. The team's player names render on the tournament detail page.
    // The page defaults to the FIRST UPCOMING day (TournamentDetailPage.tsx
    // getDefaultDayIndex). Today (2026-05-10) is past Season Opener (May 2-3),
    // so the default tab is Sunday. Our team is on day[0] = Saturday — click
    // its tab. DivisionsTable then groups by gender; sections are collapsed
    // by default when multiple genders exist, so click the matching gender
    // toggle. Teams render as `players.join(', ')` — DivisionsTable.tsx:43.
    await page.goto('/tournaments/season-opener-2026')
    await page.waitForLoadState('networkidle')

    const { genderLabel, dayLabel } = await getDivisionContext(div.id, request)
    if (dayLabel) {
      const escaped = dayLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const dayTab = page.getByRole('button', { name: new RegExp(`^${escaped}$`) })
      if (await dayTab.count()) await dayTab.first().click()
    }
    if (genderLabel) {
      const sectionToggle = page.getByRole('button', { name: new RegExp(`^${genderLabel}`) })
      if (await sectionToggle.count()) await sectionToggle.first().click()
    }

    const expectedPlayerList = players.join(', ')
    await expect(page.getByText(expectedPlayerList)).toBeVisible({ timeout: 10_000 })
  })

  test('checkout.session.expired marks order failed', async ({ request }) => {
    const tournamentRes = await request.get('/api/tournament?slug=season-opener-2026')
    const tournament = (await tournamentRes.json()) as {
      tournament_days: Array<{
        id: string
        divisions: Array<{ id: string; skill_level: string; team_size: number }>
      }>
    }
    const day = tournament.tournament_days[0]
    const div = day.divisions
      .filter((d) => d.skill_level !== 'Open')
      .sort((a, b) => a.team_size - b.team_size)[0]
    const players = Array.from({ length: div.team_size }, (_, i) => `Expired Player ${i + 1}`)

    const expiredEmail = 'expired-e2e@test.vm'
    await deleteTeamsByEmail(expiredEmail)

    const { body } = await createCheckoutSession(request, {
      captainEmail: expiredEmail,
      divisionId: div.id,
      tournamentDayId: day.id,
      players,
      teamName: 'Expired / E2E',
    })
    const order = body as { order_id: string }

    const { sessionId } = await withDb(async (c) => {
      const r = await c.query<{ stripe_session: string }>(
        `SELECT stripe_checkout_session_id AS stripe_session FROM registration_orders WHERE id = $1`,
        [order.order_id],
      )
      return { sessionId: r.rows[0].stripe_session }
    })

    const { rawBody, signature } = buildSignedWebhook({
      type: 'checkout.session.expired',
      sessionId,
      metadata: { order_id: order.order_id },
      webhookSecret: readWebhookSecret(),
    })
    const res = await request.post('/api/stripe-webhook', {
      headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
      data: rawBody,
    })
    expect(res.status()).toBe(200)
    expect(await getOrderStatus(order.order_id)).toBe('failed')

    await deleteTeamsByEmail(expiredEmail)
  })
})
