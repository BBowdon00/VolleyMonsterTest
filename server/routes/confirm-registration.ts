import type { RouteConfig } from '../../api/_shim'
import { db } from './_lib/db'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  const orderId = url.searchParams.get('order_id')

  if (!sessionId && !orderId) {
    return Response.json({ error: 'Missing session_id or order_id' }, { status: 400 })
  }

  let rows
  if (sessionId) {
    rows = await db.sql`
      SELECT id, status, captain_email
      FROM registration_orders
      WHERE stripe_checkout_session_id = ${sessionId}
      LIMIT 1
    `
  } else {
    rows = await db.sql`
      SELECT id, status, captain_email
      FROM registration_orders
      WHERE id = ${orderId}::uuid
      LIMIT 1
    `
  }

  const order = rows[0] as { id: string; status: string; captain_email: string } | undefined
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

  return Response.json({
    status: order.status,
    order_id: order.id,
    captain_email: order.captain_email,
  })
}

export const config: RouteConfig = { path: '/api/confirm-registration' }
