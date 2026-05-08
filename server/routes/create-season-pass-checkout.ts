import type { RouteConfig } from '../../api/_shim'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from './_lib/db'
import { stripe } from './_lib/stripe'

const PASS_PRICE_CENTS = 30000
const PASS_YEAR = 2026

function generatePassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(12)
  return `VM${PASS_YEAR}-${Array.from(bytes, (b) => chars[b % chars.length]).join('')}`
}

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
})

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'validation_error', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { name, email } = parsed.data

  // Generate a collision-free code (retry on the rare collision)
  let code = generatePassCode()
  for (;;) {
    const existing =
      await db.sql`SELECT id FROM season_passes WHERE upper(code) = upper(${code}) LIMIT 1`
    if ((existing as unknown[]).length === 0) break
    code = generatePassCode()
  }

  const passRows = await db.sql`
    INSERT INTO public.season_passes (code, holder_name, holder_email, year, status)
    VALUES (${code}, ${name}, ${email}, ${PASS_YEAR}, 'pending_payment')
    RETURNING id
  `
  const passId = (passRows[0] as { id: string }).id

  const siteUrl = process.env.PUBLIC_SITE_URL ?? ''

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: PASS_PRICE_CENTS,
          product_data: {
            name: `Volley Monster ${PASS_YEAR} Season Pass`,
            description: `Covers your individual registration fee for any non-Open division at every ${PASS_YEAR} tournament.`,
          },
        },
        quantity: 1,
      },
    ],
    customer_email: email,
    metadata: { type: 'season_pass', pass_id: passId },
    success_url: `${siteUrl}/season-pass/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/season-pass`,
  })

  await db.sql`UPDATE season_passes SET stripe_checkout_session_id = ${session.id} WHERE id = ${passId}`

  return Response.json({ url: session.url })
}

export const config: RouteConfig = { path: '/api/create-season-pass-checkout' }
