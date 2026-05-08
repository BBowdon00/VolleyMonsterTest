import type { RouteConfig } from '../../api/_shim'
import type { Context } from '../../api/_shim'
import Stripe from 'stripe'
import { stripe } from './_lib/stripe'
import { db } from './_lib/db'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const rawBody = await req.arrayBuffer()
  const sig = req.headers.get('stripe-signature') ?? ''
  if (!sig) return Response.json({ error: 'Missing stripe-signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency check
  const existing =
    await db.sql`SELECT event_id FROM processed_webhooks WHERE event_id = ${event.id} LIMIT 1`
  if (existing.length > 0) return Response.json({ received: true })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event, context)
        break
      case 'checkout.session.expired':
        await handleCheckoutExpired(event)
        break
      case 'charge.refunded':
        await handleChargeRefunded(event)
        break
      default:
        break
    }
    await db.sql`INSERT INTO processed_webhooks (event_id, event_type, processed_at) VALUES (${event.id}, ${event.type}, NOW())`
  } catch (err) {
    console.error(`Error processing Stripe event ${event.id} (${event.type}):`, err)
  }

  return Response.json({ received: true })
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(event: Stripe.Event, context: Context) {
  const session = event.data.object as Stripe.Checkout.Session

  // Season pass purchase
  if (session.metadata?.type === 'season_pass') {
    await handleSeasonPassCompleted(session, context)
    return
  }

  // Registration order
  const orders =
    await db.sql`SELECT id FROM registration_orders WHERE stripe_checkout_session_id = ${session.id} LIMIT 1`
  const order = orders[0] as { id: string } | undefined
  if (!order) {
    console.error(`No registration_order found for session ${session.id}`)
    return
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  await db.sql`
    UPDATE registration_orders
    SET status = 'paid', paid_at = NOW(), stripe_payment_intent_id = ${paymentIntentId}
    WHERE id = ${order.id}
  `

  const regs = await db.sql`SELECT team_id FROM registrations WHERE order_id = ${order.id}`
  if (regs.length > 0) {
    const teamIds = (regs as { team_id: string }[]).map((r) => r.team_id)
    await db.sql`UPDATE teams SET status = 'confirmed' WHERE id = ANY(${teamIds}::uuid[])`
  }

  const sessionAny = session as unknown as { charge?: string | null }
  const chargeId = typeof sessionAny.charge === 'string' ? sessionAny.charge : null

  await db.sql`
    INSERT INTO payments (order_id, stripe_payment_intent_id, stripe_charge_id, amount_cents, currency, status, refunded_amount_cents, raw_event)
    VALUES (${order.id}, ${paymentIntentId ?? ''}, ${chargeId}, ${session.amount_total ?? 0}, ${session.currency ?? 'usd'}, 'succeeded', 0, ${JSON.stringify(event)}::jsonb)
  `

  const siteUrl = process.env.PUBLIC_SITE_URL
  if (siteUrl) {
    context.waitUntil(
      fetch(`${siteUrl}/api/send-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': process.env.ADMIN_TOKEN ?? '',
        },
        body: JSON.stringify({ order_id: order.id }),
      }).catch((err) => console.error('Email trigger failed:', err)),
    )
  }
}

async function handleSeasonPassCompleted(session: Stripe.Checkout.Session, context: Context) {
  const passId = session.metadata?.pass_id
  if (!passId) {
    console.error('Season pass checkout missing pass_id in metadata', session.id)
    return
  }

  await db.sql`UPDATE season_passes SET status = 'active' WHERE id = ${passId}::uuid`

  const siteUrl = process.env.PUBLIC_SITE_URL
  if (siteUrl) {
    context.waitUntil(
      fetch(`${siteUrl}/api/send-season-pass-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': process.env.ADMIN_TOKEN ?? '',
        },
        body: JSON.stringify({ pass_id: passId }),
      }).catch((err) => console.error('Season pass email trigger failed:', err)),
    )
  }
}

async function handleCheckoutExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session

  // Cancel expired season pass purchases
  const passRows =
    await db.sql`SELECT id FROM season_passes WHERE stripe_checkout_session_id = ${session.id} LIMIT 1`
  if (passRows.length > 0) {
    const pass = passRows[0] as { id: string }
    await db.sql`UPDATE season_passes SET status = 'cancelled' WHERE id = ${pass.id}`
    return
  }

  // Expire registration orders
  const orders =
    await db.sql`SELECT id FROM registration_orders WHERE stripe_checkout_session_id = ${session.id} LIMIT 1`
  const order = orders[0] as { id: string } | undefined
  if (!order) {
    console.error(`No registration_order found for expired session ${session.id}`)
    return
  }
  await db.sql`UPDATE registration_orders SET status = 'failed' WHERE id = ${order.id}`
}

async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge

  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null)

  if (!paymentIntentId) {
    console.error('charge.refunded event has no payment_intent', charge.id)
    return
  }

  const payments =
    await db.sql`SELECT id, order_id FROM payments WHERE stripe_payment_intent_id = ${paymentIntentId} LIMIT 1`
  const payment = payments[0] as { id: string; order_id: string } | undefined
  if (!payment) {
    console.error(`No payment found for payment_intent ${paymentIntentId}`)
    return
  }

  await db.sql`
    UPDATE payments
    SET refunded_amount_cents = ${charge.amount_refunded}, refunded_at = NOW(), raw_event = ${JSON.stringify(event)}::jsonb
    WHERE id = ${payment.id}
  `

  if (charge.amount_refunded === charge.amount) {
    const regs =
      await db.sql`SELECT team_id FROM registrations WHERE order_id = ${payment.order_id}`
    if (regs.length > 0) {
      const teamIds = (regs as { team_id: string }[]).map((r) => r.team_id)
      await db.sql`UPDATE teams SET status = 'cancelled' WHERE id = ANY(${teamIds}::uuid[])`
    }
  }
}

export const config: RouteConfig = { path: '/api/stripe-webhook' }
