import type { Config, Context } from '@netlify/edge-functions'

export default async (req: Request, context: Context) => {
  if (Netlify.env.get('STRIPE_BYPASS') === 'true' && context.deploy.context === 'production') {
    return new Response(
      JSON.stringify({
        error: 'bypass_not_allowed',
        message: 'Stripe bypass is disabled in production',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }
  return context.next()
}

export const config: Config = { path: '/api/create-checkout-session' }
