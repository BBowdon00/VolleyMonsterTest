import { test, expect } from '@playwright/test'
import { stripeTrigger } from './helpers/stripeTrigger'
import { withDb } from './helpers/db'

// Pipeline-level tests using the Stripe CLI's `stripe trigger`. Unlike the
// forged-webhook tests (registration-webhook.spec.ts), these exercise the real
// Stripe → `stripe listen` → server pipeline. They prove that:
//
//   1. `stripe listen` is actually delivering events to our endpoint
//   2. Signature verification works against real Stripe-signed events
//   3. Metadata-based event lookup (season pass) works end-to-end
//
// They DO NOT replace the forged-webhook tests for registration orders,
// because that handler looks up rows by stripe_checkout_session_id (which
// `stripe trigger` generates randomly with no way to override).

async function pollUntil<T>(
  fn: () => Promise<T | null | undefined>,
  timeoutMs: number,
): Promise<T | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const v = await fn()
    if (v) return v
    await new Promise((r) => setTimeout(r, 250))
  }
  return null
}

test.describe('@trigger stripe-trigger pipeline', () => {
  test('stripe listen delivers events to /api/stripe-webhook (pipeline alive)', async () => {
    // Trigger an event we don't specifically handle. The webhook endpoint
    // returns 200 and records it in processed_webhooks regardless of type.
    const before = await withDb(async (c) => {
      const r = await c.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM processed_webhooks WHERE event_type = $1`,
        ['payment_intent.succeeded'],
      )
      return Number(r.rows[0]?.count ?? '0')
    })

    const trig = stripeTrigger('payment_intent.succeeded')
    expect(trig.ok, `stripe trigger failed:\nstdout: ${trig.stdout}\nstderr: ${trig.stderr}`).toBe(
      true,
    )

    const grew = await pollUntil(async () => {
      const after = await withDb(async (c) => {
        const r = await c.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM processed_webhooks WHERE event_type = $1`,
          ['payment_intent.succeeded'],
        )
        return Number(r.rows[0]?.count ?? '0')
      })
      return after > before ? after : null
    }, 15_000)

    expect(
      grew,
      'No new processed_webhooks row appeared within 15s — `stripe listen` is not forwarding to /api/stripe-webhook',
    ).not.toBeNull()
  })

  test('season pass activates when checkout.session.completed arrives via stripe listen', async () => {
    // Insert a pending_payment season pass with a deterministic code, so we
    // can find it again after the webhook fires.
    const code = `VM2026-TRIG${Date.now().toString(36).slice(-8).toUpperCase()}`
    const passId = await withDb(async (c) => {
      const r = await c.query<{ id: string }>(
        `INSERT INTO public.season_passes (code, holder_name, holder_email, year, status)
         VALUES ($1, 'Trigger Test', 'trigger-test@test.vm', 2026, 'pending_payment')
         RETURNING id`,
        [code],
      )
      return r.rows[0].id
    })

    try {
      // Verify precondition
      const initialStatus = await withDb(async (c) => {
        const r = await c.query<{ status: string }>(
          `SELECT status FROM season_passes WHERE id = $1`,
          [passId],
        )
        return r.rows[0]?.status
      })
      expect(initialStatus).toBe('pending_payment')

      // Trigger checkout.session.completed with our metadata. The webhook
      // handler keys off session.metadata.pass_id to find this row.
      const trig = stripeTrigger('checkout.session.completed', {
        add: {
          'checkout_session:metadata.type': 'season_pass',
          'checkout_session:metadata.pass_id': passId,
        },
      })
      expect(
        trig.ok,
        `stripe trigger failed:\nstdout: ${trig.stdout}\nstderr: ${trig.stderr}`,
      ).toBe(true)

      // Poll until the pass row flips to 'active'
      const activated = await pollUntil(async () => {
        const status = await withDb(async (c) => {
          const r = await c.query<{ status: string }>(
            `SELECT status FROM season_passes WHERE id = $1`,
            [passId],
          )
          return r.rows[0]?.status
        })
        return status === 'active' ? status : null
      }, 15_000)

      expect(
        activated,
        'season_passes row did not flip to active within 15s — webhook delivery or handler broken',
      ).toBe('active')
    } finally {
      await withDb(async (c) => {
        await c.query(`DELETE FROM season_passes WHERE id = $1`, [passId])
      })
    }
  })
})
