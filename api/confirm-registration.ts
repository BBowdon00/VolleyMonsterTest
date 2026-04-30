import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from './_lib/supabaseAdmin'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sessionId = req.query['session_id']
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Missing session_id query parameter' })
  }

  const { data: order, error } = await supabaseAdmin
    .from('registration_orders')
    .select('id, status, captain_email')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching registration order:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  return res.status(200).json({
    status: order.status,
    order_id: order.id,
    captain_email: order.captain_email,
  })
}
