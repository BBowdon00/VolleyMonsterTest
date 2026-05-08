import { createHash, timingSafeEqual } from 'crypto'

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

export function requireAdmin(req: Request): Response | null {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) {
    return Response.json(
      { error: 'admin_disabled', message: 'ADMIN_TOKEN not configured' },
      { status: 503 },
    )
  }
  const provided = req.headers.get('x-admin-token') ?? ''
  if (!timingSafeEqual(hashToken(expected), hashToken(provided))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}
