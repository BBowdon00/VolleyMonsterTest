# Netlify Full-Stack Migration Plan

> Last updated: 2026-04-30
> Current stack: Vercel (static + Functions) + Supabase (PostgREST + Storage)
> Target stack: Netlify (static + Functions v2) + Netlify Database (managed Postgres, GA)

---

## What changes at a glance

| Layer           | Today (Vercel)                                                             | After (Netlify)                                             |
| --------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Config          | `vercel.json`                                                              | `netlify.toml`                                              |
| Functions       | `api/*.ts`, `VercelRequest`/`VercelResponse`                               | `netlify/functions/*.ts`, Web-standard `Request`/`Response` |
| Database client | `@supabase/supabase-js` (service role)                                     | `@netlify/database` (`getDatabase()`)                       |
| Front-end data  | `supabase.from('tournaments')` via PostgREST                               | `fetch('/api/tournaments')` to new Netlify Functions        |
| Env vars        | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Nothing — `NETLIFY_DB_URL` is auto-injected by Netlify      |
| Storage         | Supabase Storage public CDN for hero images                                | Keep as-is (public CDN URLs need no SDK)                    |
| Auth/RLS        | PostgREST + RLS policies                                                   | Application-level guards in each function                   |

---

## Netlify Database — key facts

Netlify Database (GA as of April 28, 2026) is a managed Postgres database built into the Netlify platform.

- Install `@netlify/database` → database auto-provisioned on next deploy
- `NETLIFY_DB_URL` is injected automatically across all environments — no connection string to configure
- **Each deploy preview gets its own database branch** forked from production data
- Migrations live in `netlify/database/migrations/` and are applied by the deploy automatically
- Powered by Neon under the hood, but you never interact with Neon directly
- `@netlify/neon` (the old beta extension) is deprecated as of April 2026 — do not use it

---

## Step-by-step

### 1. Netlify project setup (manual)

```bash
# Link the repo to a new Netlify site
npx netlify link

# Bootstrap the database (installs @netlify/database, creates migration dir, provisions local DB)
netlify database init --yes
```

No `DATABASE_URL` to configure anywhere — Netlify sets `NETLIFY_DB_URL` in every environment.

---

### 2. Schema migration — raw SQL migration files

Since the schema uses complex Postgres features (security-definer functions, generated columns, custom enums, triggers) that Drizzle's schema builder can't express, use raw SQL migrations instead of Drizzle:

```bash
netlify database migrations new -d "initial schema"
netlify database migrations new -d "seed tournaments"
```

This creates files under `netlify/database/migrations/`. Paste the content from:

- `supabase/SCHEMA.sql` (tables, enums, triggers, views, RPCs) → first migration
- The seed INSERT block → second migration

Apply locally:

```bash
netlify database migrations apply
```

Hosted databases (preview branches, production) are migrated automatically on deploy — never run migrations against them manually.

---

### 3. Replace DB client

Delete `api/_lib/supabaseAdmin.ts`. Create `netlify/functions/_lib/db.ts`:

```ts
import { getDatabase } from '@netlify/database'
export const db = getDatabase()
```

Replace Supabase calls with tagged template queries:

```ts
// Before (Supabase)
await supabaseAdmin.from('registration_orders').update({ status: 'paid' }).eq('id', orderId)

// After (@netlify/database)
await db.sql`UPDATE registration_orders SET status = 'paid', paid_at = NOW() WHERE id = ${orderId}`
```

Calling stored procedures:

```ts
// Before
await supabaseAdmin.rpc('register_order', { p_captain_email, p_teams, ... })

// After
const [result] = await db.sql`
  SELECT public.register_order(
    ${captain.email}, ${captain.name}, ${captain.phone}, ${captain.city},
    ${totalCents}, ${JSON.stringify(rpcTeams)}::jsonb
  )
`
```

Multi-statement transactions (e.g. Stripe bypass block):

```ts
const client = await db.pool.connect()
try {
  await client.query('BEGIN')
  await client.query(
    `UPDATE registration_orders SET status='paid', stripe_checkout_session_id=$1, paid_at=NOW() WHERE id=$2`,
    [fakeSessionId, orderId],
  )
  await client.query(`UPDATE teams SET status='confirmed' WHERE id = ANY($1)`, [teamIds])
  await client.query(
    `INSERT INTO payments (order_id, stripe_payment_intent_id, stripe_charge_id, amount_cents, currency, status, refunded_amount_cents)
     VALUES ($1,$2,$3,$4,'usd','succeeded',0)`,
    [orderId, `pi_bypass_${orderId}`, `ch_bypass_${orderId}`, totalCents],
  )
  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  throw e
} finally {
  client.release()
}
```

---

### 4. Rewrite functions as Netlify Functions v2

Move `api/*.ts` → `netlify/functions/*.ts`. Change signatures:

```ts
// Before (Vercel)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = req.body
  const ip = req.headers['x-forwarded-for']
  res.status(200).json({ ok: true })
}

// After (Netlify Functions v2 — web-standard)
export default async (req: Request): Promise<Response> => {
  const body = await req.json()
  const ip = req.headers.get('x-forwarded-for')
  return Response.json({ ok: true })
}
export const config = { path: '/api/function-name' }
```

Stripe webhook raw body (replaces the custom Node stream reader):

```ts
const rawBody = await req.arrayBuffer()
const sig = req.headers.get('stripe-signature') ?? ''
const event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, STRIPE_WEBHOOK_SECRET)
```

---

### 5. Add two new data-API functions (replacing PostgREST)

```ts
// netlify/functions/tournaments.ts — GET /api/tournaments
import { db } from './_lib/db'

export default async (_req: Request): Promise<Response> => {
  const rows = await db.sql`
    SELECT t.*, td.*, d.*, dc.confirmed_teams, dc.spots_remaining
    FROM tournaments t
    JOIN tournament_days td ON td.tournament_id = t.id
    JOIN divisions d ON d.tournament_day_id = td.id
    LEFT JOIN division_capacity dc ON dc.division_id = d.id
    WHERE t.status = 'published'
    ORDER BY t.start_date, td.sort_order, d.sort_order
  `
  return Response.json(rows)
}
export const config = { path: '/api/tournaments' }
```

```ts
// netlify/functions/tournament.ts — GET /api/tournament?slug=...
export default async (req: Request): Promise<Response> => {
  const slug = new URL(req.url).searchParams.get('slug')
  // ... same pattern
}
export const config = { path: '/api/tournament' }
```

Update `src/api/tournaments.ts` to `fetch('/api/tournaments')` instead of Supabase client calls. The Zod schemas and TypeScript types stay the same — only the transport changes.

---

### 6. Remove Supabase frontend client

- Delete `src/lib/supabaseClient.ts`
- Remove `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` from `.env.local` / `.env.example`
- Uninstall: `npm uninstall @supabase/supabase-js`
- Hero image `<img>` tags continue to work — they use raw Supabase Storage CDN URLs, no SDK needed

---

### 7. Environment variables

**Remove:**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Auto-injected by Netlify (no action needed):**

- `NETLIFY_DB_URL`

**Keep (set in Netlify dashboard):**

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `PUBLIC_SITE_URL`
- `STRIPE_BYPASS` (set to `false` in production)

---

### 8. `netlify.toml`

Delete `vercel.json` and create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

# SPA fallback — serve index.html for all non-function routes
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com; connect-src 'self' https://api.stripe.com https://*.supabase.co; img-src 'self' data: https://*.supabase.co; style-src 'self' 'unsafe-inline'"

[[functions]]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[functions."create-checkout-session"]
  path = "/api/create-checkout-session"
[functions."confirm-registration"]
  path = "/api/confirm-registration"
[functions."stripe-webhook"]
  path = "/api/stripe-webhook"
[functions."send-confirmation-email"]
  path = "/api/send-confirmation-email"
[functions."health"]
  path = "/api/health"
[functions."tournaments"]
  path = "/api/tournaments"
[functions."tournament"]
  path = "/api/tournament"
```

---

## What doesn't change

- All registration flow logic and form steps
- Stripe integration (same keys, same webhook structure)
- Resend email integration
- Hero image URLs (Supabase public CDN, no SDK needed)
- The Postgres schema — it's standard Postgres, Netlify Database runs it as-is
- The `STRIPE_BYPASS` dev mode
- The `supabase/seed-dev.sql` file (run once via `netlify database connect --query` or paste into a migration)
- TanStack Query hooks — only the underlying fetch target changes

---

## Preview branching (free, no setup)

Each deploy preview automatically gets its own Postgres branch forked from production data. Migrations run against the preview branch on deploy — a failed migration fails the preview, not production. This replaces the need for a separate staging database.

---

## Key risk: N+1 queries

PostgREST's nested joins fetched everything in one query. With direct SQL, write explicit JOINs for the tournament detail endpoint to avoid N+1. The `register_order` and `manage_team_lookup` stored procedures already encapsulate their queries — call them via `db.sql` as shown above.

---

---

## Additional Netlify integrations (beyond the core migration)

These are platform features that go beyond the baseline swap — each one is a meaningful improvement specific to how Volley Monster works.

---

### A. Netlify Image CDN — hero image optimization

Currently hero images are served directly from the Supabase Storage CDN as full-resolution PNGs. Netlify has a built-in `/.netlify/images` transformation endpoint that does on-the-fly WebP/AVIF conversion and resizing with CDN caching — no extra setup.

**Quick win (zero Supabase migration needed):** allowlist the Supabase Storage domain and proxy through Image CDN:

```toml
# netlify.toml
[images]
remote_images = ["https://zjqoyxxjadqkfzymktgd\\.supabase\\.co/.*"]

[[redirects]]
from = "/img/hero/:splat"
to = "/.netlify/images?url=https://zjqoyxxjadqkfzymktgd.supabase.co/storage/v1/object/public/tournaments/:splat&w=1200&h=630&fit=cover&q=80"
status = 200

[[redirects]]
from = "/img/card/:splat"
to = "/.netlify/images?url=https://zjqoyxxjadqkfzymktgd.supabase.co/storage/v1/object/public/tournaments/:splat&w=600&h=400&fit=cover&q=75"
status = 200
```

Then in `TournamentHero.tsx` and `TournamentCard.tsx`, change `src={hero_image_url}` to `src={/img/hero/${filename}}` — browsers automatically get WebP/AVIF instead of the raw PNG.

**Full migration path (Supabase Storage → Netlify Blobs):** Add an admin upload Netlify Function that `store.set()`s images to Blobs, then serve via Image CDN using local paths (no allowlisting needed). This removes the last Supabase dependency entirely.

---

### B. Netlify Blobs — admin image uploads

When an admin-facing upload UI is added, use Blobs + Image CDN instead of Supabase Storage:

```ts
// netlify/functions/upload-hero-image.ts
import { getStore } from '@netlify/blobs'

export default async (req: Request): Promise<Response> => {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const store = getStore({ name: 'tournament-images' })
  await store.set(`heroes/${slug}`, await file.arrayBuffer(), {
    metadata: { contentType: file.type },
  })
  return Response.json({ url: `/img/hero/${slug}` })
}
```

Images are then served via the Image CDN rewrite rules above, automatically optimized.

---

### C. Netlify Edge Functions — rate limiting + production bypass guard

**1. Cleaner rate limiting:** The current in-memory rate limiting in `create-checkout-session.ts` resets on every cold start. Move it to an Edge Function middleware that runs before the serverless function — and replace the header-parsing hack with `context.ip`:

```ts
// netlify/edge-functions/rate-limit.ts
const hits = new Map<string, number[]>()

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return context.next()
  const now = Date.now()
  const window = (hits.get(context.ip) ?? []).filter((t) => t > now - 60_000)
  window.push(now)
  hits.set(context.ip, window)
  if (window.length > 10) return new Response('Too many requests', { status: 429 })
  return context.next()
}

export const config = { path: '/api/create-checkout-session' }
```

**2. Production bypass guard:** Prevent `STRIPE_BYPASS=true` from accidentally working in production:

```ts
// netlify/edge-functions/bypass-guard.ts
export default async (req: Request, context: Context) => {
  if (Netlify.env.get('STRIPE_BYPASS') === 'true' && context.deploy.context === 'production') {
    return new Response('Bypass not allowed in production', { status: 403 })
  }
  return context.next()
}

export const config = { path: '/api/create-checkout-session' }
```

---

### D. CDN caching for tournament data

Tournament listings and detail pages change rarely — the same data can be served to hundreds of visitors from the CDN edge. Add cache headers to the new tournament API functions:

```ts
// netlify/functions/tournaments.ts
return Response.json(rows, {
  headers: {
    // CDN caches for 5 minutes, serves stale for 10 more while revalidating
    'Netlify-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    'Netlify-Cache-ID': 'tournaments',
    'Cache-Control': 'public, max-age=0, must-revalidate',
  },
})
```

After a successful registration (which changes `confirmed_teams` / `spots_remaining`), purge the cache:

```ts
import { purgeCache } from '@netlify/functions'
// inside create-checkout-session, after order confirmed:
await purgeCache({ tags: ['tournaments'] })
```

This means the divisions table always shows fresh spot counts right after a registration, but serves cached data otherwise.

---

### E. Scheduled Function — stale pending registration cleanup

Stripe Checkout sessions expire after 24 hours. Teams left in `pending_payment` after that are dead registrations that block division spots. There's currently nothing that cleans them up.

```ts
// netlify/functions/cleanup-pending-teams.ts
import { getDatabase } from '@netlify/database'

export default async (_req: Request): Promise<void> => {
  const db = getDatabase()
  await db.sql`
    UPDATE teams
    SET status = 'cancelled'
    WHERE status = 'pending_payment'
      AND created_at < NOW() - INTERVAL '24 hours'
  `
}

export const config: Config = {
  schedule: '@hourly', // runs every hour on published deploys
}
```

No response needed — scheduled functions are fire-and-forget.

---

### F. Background Function — confirmation email

`send-confirmation-email` is currently called fire-and-forget via `fetch()` from the Stripe webhook. This means if the webhook times out, the email never gets queued. A proper background function survives the webhook response and has up to 15 minutes:

```
netlify/functions/send-confirmation-email-background.ts
```

Named with the `-background` suffix, Netlify automatically gives it background execution. The Stripe webhook POSTs to it and immediately gets a `202` — email sends in the background without affecting webhook response time.

---

### G. Vite plugin for local Netlify dev

Install `@netlify/vite-plugin` so that `npm run dev` works with Netlify Blobs and other platform primitives locally (no `netlify dev` wrapper required):

```bash
npm install -D @netlify/vite-plugin
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin'

export default defineConfig({
  plugins: [react(), netlify()],
})
```

---

### Priority order for additional integrations

| Priority | Integration                              | Effort        | Value                                      |
| -------- | ---------------------------------------- | ------------- | ------------------------------------------ |
| High     | **D. CDN caching**                       | ~30 min       | Free performance, zero risk                |
| High     | **E. Scheduled cleanup**                 | ~30 min       | Fixes a real gap (stale pending teams)     |
| Medium   | **A. Image CDN (allowlist)**             | ~1 hour       | Better image delivery, no migration needed |
| Medium   | **C. Edge rate limiting + bypass guard** | ~1 hour       | Better than current in-memory approach     |
| Medium   | **F. Background email**                  | ~1 hour       | More reliable email delivery               |
| Low      | **G. Vite plugin**                       | ~15 min       | Nicer local dev only                       |
| Future   | **B. Blobs for image uploads**           | Several hours | Only needed when admin UI is built         |

---

## Sources

- [Netlify Database — official docs](https://docs.netlify.com/build/data-and-storage/netlify-database/)
- [Netlify Database GA changelog (Apr 28 2026)](https://www.netlify.com/changelog/2026-04-28-netlify-database/)
- [Netlify Database blog post](https://www.netlify.com/blog/netlify-database/)
- [Drizzle ORM — Netlify Database adapter](https://orm.drizzle.team/docs/connect-netlify-db)
- [Neon blog: Netlify DB powered by Neon](https://neon.com/blog/netlify-db-powered-by-neon)
- [Netlify Functions docs](https://docs.netlify.com/functions/overview/)
- [Netlify Image CDN docs](https://docs.netlify.com/image-cdn/overview/)
- [Netlify Blobs docs](https://docs.netlify.com/blobs/overview/)
- [Netlify Edge Functions docs](https://docs.netlify.com/edge-functions/overview/)
- [Netlify Caching docs](https://docs.netlify.com/platform/caching/)
