import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { IncomingMessage } from 'node:http'
import Stripe from 'stripe'
import { stripe } from './_lib/stripe'
import { supabaseAdmin } from './_lib/supabaseAdmin'

// Disable body parser so we can read the raw body for Stripe signature verification
export const config = { api: { bodyParser: false } }

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

/** Read the full raw body from an IncomingMessage stream */
function getRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 1. Read raw body and verify Stripe signature
  const rawBody = await getRawBody(req as unknown as IncomingMessage)
  const sig = req.headers['stripe-signature'] as string | undefined

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe signature verification failed:', err)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  // 2. Idempotency check
  const { data: existing } = await supabaseAdmin
    .from('processed_webhooks')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existing) {
    // Already processed — return 200 immediately
    return res.status(200).json({ received: true })
  }

  // 3. Process the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event)
        break
      case 'checkout.session.expired':
        await handleCheckoutExpired(event)
        break
      case 'charge.refunded':
        await handleChargeRefunded(event)
        break
      default:
        // Unknown event — acknowledge and ignore
        break
    }

    // Insert idempotency record after successful processing
    await supabaseAdmin.from('processed_webhooks').insert({
      event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`Error processing Stripe event ${event.id} (${event.type}):`, err)
    // Still return 200 to prevent Stripe from retrying for logic errors
    // (only re-throw for genuine infra failures if needed; here we swallow all)
  }

  return res.status(200).json({ received: true })
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session

  // Find the registration order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('registration_orders')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle()

  if (orderError) throw orderError
  if (!order) {
    console.error(`No registration_order found for session ${session.id}`)
    return
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  // Update order status
  const { error: orderUpdateError } = await supabaseAdmin
    .from('registration_orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq('id', order.id)

  if (orderUpdateError) throw orderUpdateError

  // Find all teams linked via registrations and confirm them
  const { data: registrations, error: regError } = await supabaseAdmin
    .from('registrations')
    .select('team_id')
    .eq('order_id', order.id)

  if (regError) throw regError

  if (registrations && registrations.length > 0) {
    const teamIds = registrations.map((r) => r.team_id)
    const { error: teamUpdateError } = await supabaseAdmin
      .from('teams')
      .update({ status: 'confirmed' })
      .in('id', teamIds)

    if (teamUpdateError) throw teamUpdateError
  }

  // Insert payment record
  // `charge` may be present on the session object at runtime even if not in all TS typings
  const sessionAny = session as unknown as { charge?: string | null }
  const chargeId = typeof sessionAny.charge === 'string' ? sessionAny.charge : null

  const { error: paymentError } = await supabaseAdmin.from('payments').insert({
    order_id: order.id,
    stripe_payment_intent_id: paymentIntentId ?? '',
    stripe_charge_id: chargeId,
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    status: 'succeeded',
    raw_event: event as unknown as Record<string, unknown>,
  })

  if (paymentError) throw paymentError

  // Fire-and-forget confirmation email — do NOT await, do NOT bubble errors
  const siteUrl = process.env.PUBLIC_SITE_URL
  if (siteUrl) {
    fetch(`${siteUrl}/api/send-confirmation-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id }),
    }).catch((err) => {
      console.error('Failed to trigger confirmation email (non-fatal):', err)
    })
  }
}

async function handleCheckoutExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session

  const { data: order, error: orderError } = await supabaseAdmin
    .from('registration_orders')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle()

  if (orderError) throw orderError
  if (!order) {
    console.error(`No registration_order found for expired session ${session.id}`)
    return
  }

  const { error: updateError } = await supabaseAdmin
    .from('registration_orders')
    .update({ status: 'failed' })
    .eq('id', order.id)

  if (updateError) throw updateError
  // Teams remain 'pending_payment' so the captain can retry
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

  // Find the payment record
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('id, order_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (paymentError) throw paymentError
  if (!payment) {
    console.error(`No payment found for payment_intent ${paymentIntentId}`)
    return
  }

  // Update payment with refund info
  const { error: updateError } = await supabaseAdmin
    .from('payments')
    .update({
      refunded_amount_cents: charge.amount_refunded,
      refunded_at: new Date().toISOString(),
      raw_event: event as unknown as Record<string, unknown>,
    })
    .eq('id', payment.id)

  if (updateError) throw updateError

  // If full refund, cancel all linked teams
  if (charge.amount_refunded === charge.amount) {
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('team_id')
      .eq('order_id', payment.order_id)

    if (regError) throw regError

    if (registrations && registrations.length > 0) {
      const teamIds = registrations.map((r) => r.team_id)
      const { error: teamUpdateError } = await supabaseAdmin
        .from('teams')
        .update({ status: 'cancelled' })
        .in('id', teamIds)

      if (teamUpdateError) throw teamUpdateError
    }
  }
}
