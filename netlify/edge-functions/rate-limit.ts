import type { Config, Context } from '@netlify/edge-functions'

const hits = new Map<string, number[]>()
const MAX = 10
const WINDOW_MS = 60_000

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return context.next()
  const now = Date.now()
  const window = (hits.get(context.ip) ?? []).filter((t) => t > now - WINDOW_MS)
  window.push(now)
  hits.set(context.ip, window)
  if (window.length > MAX) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', message: 'Too many requests — try again later' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
  return context.next()
}

export const config: Config = { path: '/api/create-checkout-session' }
