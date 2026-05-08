import { serve } from '@hono/node-server'
import type { Context as HonoContext } from 'hono'
import { Hono } from 'hono'
import type { Context } from './_shim'
import { makeContext } from './_shim'
import { startCron } from './cron'

import * as health from '../netlify/functions/health'
import * as tournaments from '../netlify/functions/tournaments'
import * as tournament from '../netlify/functions/tournament'
import * as createCheckout from '../netlify/functions/create-checkout-session'
import * as stripeWebhook from '../netlify/functions/stripe-webhook'
import * as confirmReg from '../netlify/functions/confirm-registration'
import * as manageTeam from '../netlify/functions/manage-team'
import * as manageUpdate from '../netlify/functions/manage-team-update-player'
import * as sendEmail from '../netlify/functions/send-confirmation-email-background'
import * as divisionTeams from '../netlify/functions/division-teams'
import * as adminTeams from '../netlify/functions/admin-teams'
import * as seedDev from '../netlify/functions/seed-dev'
import * as adminSeasonPasses from '../netlify/functions/admin-season-passes'
import * as confirmSeasonPass from '../netlify/functions/confirm-season-pass'
import * as createSeasonPassCheckout from '../netlify/functions/create-season-pass-checkout'
import * as sendSeasonPassEmail from '../netlify/functions/send-season-pass-email'
import * as validatePassCode from '../netlify/functions/validate-pass-code'

// Each entry: a Netlify-style handler module exporting `default` and `config`.
// `cleanup-pending-teams` is intentionally absent — it runs via cron only.
type HandlerModule = {
  default: (req: Request, ctx: Context) => Promise<Response | void>
  config: { path: string; method?: string | string[] }
}

const modules: HandlerModule[] = [
  health,
  tournaments,
  tournament,
  createCheckout,
  stripeWebhook,
  confirmReg,
  manageTeam,
  manageUpdate,
  sendEmail,
  divisionTeams,
  adminTeams,
  seedDev,
  adminSeasonPasses,
  confirmSeasonPass,
  createSeasonPassCheckout,
  sendSeasonPassEmail,
  validatePassCode,
] as unknown as HandlerModule[]

const app = new Hono()

for (const m of modules) {
  const cfg = m.config
  const methods = Array.isArray(cfg.method) ? cfg.method : cfg.method ? [cfg.method] : ['ALL']
  const handler = async (c: HonoContext) => {
    const ctx = makeContext(c.req.raw)
    const result = await m.default(c.req.raw, ctx)
    // Background functions (e.g. cleanup-pending-teams) return void; everything
    // else returns a Response. Duck-type rather than instanceof — undici's
    // Response class can differ from globalThis.Response across runtimes.
    return (result ?? new Response(null, { status: 204 })) as Response
  }
  for (const method of methods) {
    const verb = method.toUpperCase()
    if (verb === 'ALL') {
      app.all(cfg.path, handler)
    } else if (verb === 'GET') {
      app.get(cfg.path, handler)
    } else if (verb === 'POST') {
      app.post(cfg.path, handler)
    } else if (verb === 'PUT') {
      app.put(cfg.path, handler)
    } else if (verb === 'PATCH') {
      app.patch(cfg.path, handler)
    } else if (verb === 'DELETE') {
      app.delete(cfg.path, handler)
    } else if (verb === 'OPTIONS') {
      app.options(cfg.path, handler)
    } else {
      throw new Error(`Unsupported method ${method} on ${cfg.path}`)
    }
  }
}

startCron()

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`[api] listening on http://0.0.0.0:${port}`)
})
