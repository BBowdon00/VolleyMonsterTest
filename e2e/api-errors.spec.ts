import { test, expect } from '@playwright/test'

// Failure-mode tests — these document expected error responses for invalid
// inputs. They PASS when the API correctly rejects bad input. If any of these
// start failing, the API is silently accepting something it shouldn't.

test.describe('@smoke API error contracts', () => {
  test('checkout-session: missing body returns 400', async ({ request }) => {
    const res = await request.post('/api/create-checkout-session', { data: {} })
    expect(res.status()).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('validation_error')
  })

  test('checkout-session: invalid pass code returns 400 invalid_pass_codes', async ({
    request,
  }) => {
    // Use real seeded division ids by first hitting /api/tournament
    const tournamentRes = await request.get('/api/tournament?slug=season-opener-2026')
    expect(tournamentRes.ok()).toBeTruthy()
    const tournament = (await tournamentRes.json()) as {
      tournament_days: Array<{
        id: string
        divisions: Array<{ id: string; skill_level: string; team_size: number }>
      }>
    }
    // Pick a non-Open division so pass codes are validated
    const day = tournament.tournament_days[0]
    const div = day.divisions.find((d) => d.skill_level !== 'Open')!

    const res = await request.post('/api/create-checkout-session', {
      data: {
        captain: {
          name: 'Bad Code',
          email: 'badcode@test.vm',
          phone: '3015551234',
          city: 'Rockville',
        },
        dayEntries: [
          {
            tournamentDayId: day.id,
            divisionId: div.id,
            teamName: 'Test Team',
            players: Array.from({ length: div.team_size }, (_, i) => ({
              name: `Player ${i + 1}`,
              passCode: 'VM2026-NOTAREALCODE',
            })),
          },
        ],
        agreedToRules: true,
      },
    })
    expect(res.status()).toBe(400)
    const body = (await res.json()) as { error: string; codes: string[] }
    expect(body.error).toBe('invalid_pass_codes')
    expect(body.codes).toContain('VM2026-NOTAREALCODE')
  })

  test('checkout-session: agreedToRules=false rejected', async ({ request }) => {
    const res = await request.post('/api/create-checkout-session', {
      data: {
        captain: {
          name: 'No Agree',
          email: 'noagree@test.vm',
          phone: '3015551234',
          city: 'Rockville',
        },
        dayEntries: [],
        agreedToRules: false,
      },
    })
    expect(res.status()).toBe(400)
  })

  test('manage-team with invalid token returns error', async ({ request }) => {
    const res = await request.get('/api/manage-team?token=00000000-0000-0000-0000-000000000000')
    expect([400, 404]).toContain(res.status())
  })

  test('manage-team with malformed token returns error', async ({ request }) => {
    const res = await request.get('/api/manage-team?token=not-a-uuid')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(600)
  })

  test('tournament with unknown slug returns 404', async ({ request }) => {
    const res = await request.get('/api/tournament?slug=does-not-exist-2099')
    expect(res.status()).toBe(404)
  })

  test('division-teams without division_id returns 400', async ({ request }) => {
    const res = await request.get('/api/division-teams')
    expect(res.status()).toBe(400)
  })

  test('validate-pass-code with bogus code returns valid:false', async ({ request }) => {
    const res = await request.get('/api/validate-pass-code?code=VM2026-DOESNOTEXIST')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { valid: boolean }
    expect(body.valid).toBe(false)
  })

  test('stripe-webhook: unsigned POST is rejected', async ({ request }) => {
    const res = await request.post('/api/stripe-webhook', {
      data: { id: 'evt_test', type: 'checkout.session.completed' },
    })
    expect(res.status()).toBe(400)
  })

  test('stripe-webhook: bad signature is rejected', async ({ request }) => {
    const res = await request.post('/api/stripe-webhook', {
      headers: { 'stripe-signature': 't=1,v1=deadbeef' },
      data: { id: 'evt_test', type: 'checkout.session.completed' },
    })
    expect(res.status()).toBe(400)
  })
})
