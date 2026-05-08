import type { RouteConfig } from '../../api/_shim'

export default async (_req: Request): Promise<Response> => {
  return Response.json({ ok: true, ts: new Date().toISOString() })
}

export const config: RouteConfig = { path: '/api/health' }
