import type { Config } from '@netlify/functions'

export default async (_req: Request): Promise<Response> => {
  return Response.json({ ok: true, ts: new Date().toISOString() })
}

export const config: Config = { path: '/api/health' }
