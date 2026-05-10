import Stripe from 'stripe'

// Forge a checkout.session.completed webhook the way the production endpoint
// expects: signed with STRIPE_WEBHOOK_SECRET so `stripe.webhooks.constructEvent`
// accepts it without a real Stripe round-trip.
export function buildSignedWebhook(opts: {
  type: 'checkout.session.completed' | 'checkout.session.expired'
  sessionId: string
  metadata?: Record<string, string>
  amountTotal?: number
  paymentIntent?: string
  webhookSecret: string
}): { rawBody: string; signature: string } {
  const event = {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    type: opts.type,
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: {
        id: opts.sessionId,
        object: 'checkout.session',
        metadata: opts.metadata ?? {},
        payment_intent: opts.paymentIntent ?? `pi_test_${Date.now()}`,
        amount_total: opts.amountTotal ?? 0,
        currency: 'usd',
        payment_status: opts.type === 'checkout.session.completed' ? 'paid' : 'unpaid',
      },
    },
  }
  const rawBody = JSON.stringify(event)
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: opts.webhookSecret,
  })
  return { rawBody, signature }
}

export function readWebhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET
  if (!s) {
    throw new Error('STRIPE_WEBHOOK_SECRET not set — globalSetup should have populated it')
  }
  return s
}
