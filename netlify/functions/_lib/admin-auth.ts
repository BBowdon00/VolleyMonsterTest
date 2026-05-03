// Shared admin-auth check for /api/admin/* endpoints.
// Configure ADMIN_TOKEN in .env.local locally and in the Netlify dashboard
// (production / deploy-preview / branch-deploy contexts) for any environment
// where admin should be enabled.

export function requireAdmin(req: Request): Response | null {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) {
    return Response.json(
      { error: 'admin_disabled', message: 'ADMIN_TOKEN not configured' },
      { status: 503 },
    )
  }
  const provided = req.headers.get('x-admin-token')
  if (provided !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}
