# Volley Monster — Agent Reference

Beach volleyball tournament registration app. Captains register teams, pay via Stripe Checkout, and manage their roster via a magic-link page.

## Stack

| Layer              | Technology                                                                      |
| ------------------ | ------------------------------------------------------------------------------- |
| Frontend           | React 19, Vite 8, TypeScript, Tailwind CSS v4                                   |
| Routing            | React Router v7                                                                 |
| Data fetching      | TanStack Query v5                                                               |
| Forms / validation | React Hook Form, Zod v4                                                         |
| Backend            | Netlify Functions v2 (Node, web-standard `Request`/`Response`)                  |
| Database           | Netlify Database — Postgres via `@netlify/database` (`db.sql` tagged templates) |
| Payments           | Stripe Checkout (hosted redirect — no embedded form)                            |
| Email              | Resend API via background function                                              |
| Toasts             | Sonner                                                                          |

No Supabase. No Vercel. No PostgREST.

## Directory layout

```
netlify/
  functions/          # Serverless API — all at /api/*
    _lib/db.ts        # getDatabase() singleton
    _lib/stripe.ts    # Stripe client singleton
    tournaments.ts        GET /api/tournaments
    tournament.ts         GET /api/tournament?slug=
    create-checkout-session.ts  POST /api/create-checkout-session
    stripe-webhook.ts     POST /api/stripe-webhook
    confirm-registration.ts     GET /api/confirm-registration?session_id=
    manage-team.ts        GET /api/manage-team?token=
    manage-team-update-player.ts  POST /api/manage-team-update-player
    send-confirmation-email-background.ts  (triggered by webhook, 15-min timeout)
    cleanup-pending-teams.ts  (scheduled @hourly)
    health.ts             GET /api/health
  edge-functions/
    rate-limit.ts     # Rate-limits POST /api/create-checkout-session (10 req/min)
  database/
    migrations/       # Applied automatically on Netlify deploy
src/
  api/tournaments.ts  # Zod schemas + fetch wrappers + TanStack Query hooks
  features/
    registration/     # Multi-step registration flow (StepDays → StepCaptain → StepRoster → StepReview)
    manage/           # EditableRoster used by ManageTeamPage
  pages/
  components/
  lib/
    schemas/registration.ts  # Zod schema shared by frontend and checkout function
```

## Local dev

Requires two terminals:

```bash
# Terminal 1 — app + functions on port 8888
netlify dev

# Terminal 2 — forwards Stripe events to local webhook handler
stripe listen --forward-to localhost:8888/api/stripe-webhook
# Copy the printed whsec_... into .env.local as STRIPE_WEBHOOK_SECRET
```

## Environment variables

| Variable                      | Where set                                               | Notes                                              |
| ----------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `NETLIFY_DB_URL`              | Auto-injected by Netlify                                | Never set manually except for external tools       |
| `STRIPE_SECRET_KEY`           | `.env.local` / Netlify dashboard                        | `sk_test_...` locally, `sk_live_...` in production |
| `STRIPE_WEBHOOK_SECRET`       | `.env.local` (from `stripe listen`) / Netlify dashboard | Different secret per environment                   |
| `RESEND_API_KEY`              | `.env.local` / Netlify dashboard                        |                                                    |
| `EMAIL_FROM`                  | `.env.local` / Netlify dashboard                        |                                                    |
| `PUBLIC_SITE_URL`             | `.env.local` = `http://localhost:8888`                  | Set to production URL in Netlify dashboard         |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `.env.local` / Netlify dashboard                        | `pk_test_...` locally                              |
| `ADMIN_TOKEN`                 | `.env.local` / Netlify dashboard                        | Random secret. Required for `/admin` to be usable. |

Netlify dashboard keys are scoped per context — production gets live Stripe keys, previews/branch deploys get test keys. See `netlify.toml` `[context.*]` sections.

## Database migrations

Schema lives in `netlify/database/migrations/`. Netlify applies them automatically on deploy.

```bash
npm run db:migrate   # apply pending migrations to local dev DB only
npm run db:seed      # populate local dev DB with fake teams/players (requires `netlify dev` running)
```

To make a schema change: add a new file under `netlify/database/migrations/` with a timestamp prefix (e.g. `20260501000000_add-foo/migration.sql`), then run `npm run db:migrate` locally to test it.

When adding a new top-level route in `src/routes.tsx`, also add a corresponding `[[redirects]]` block in `netlify.toml` (e.g. `from = "/foo/*" → /index.html 200`). The SPA fallback is per-route — not a wildcard — so Vite's module paths (`/src/*`, `/@vite/*`) aren't hijacked in `netlify dev`.

The seed script POSTs to `/api/seed-dev`, a function gated by `context.deploy.context !== 'production'` that reads `netlify/database/seed-dev.sql` and runs it via `db.pool`. Seed data is identified by `captain_email LIKE '%@test.vm'` and the script is idempotent.

## Admin

Token-gated admin UI at `/admin`. Token is set via the `ADMIN_TOKEN` env var; users enter it once per session at `/admin` and it's stored in `sessionStorage`.

```
src/pages/admin/             AdminLayout (auth gate + nav), AdminDashboard, AdminTeams, …
src/components/admin/        AdminLogin, AdminNav
src/lib/admin.ts             Token storage helpers + `adminFetch()` wrapper that sends `x-admin-token`
netlify/functions/_lib/admin-auth.ts   `requireAdmin(req)` — returns 401/503 Response or null
netlify/functions/admin-*.ts           Backend endpoints under `/api/admin/*`
```

To add a new admin feature:

1. Add a new page under `src/pages/admin/`
2. Add it to the `links` array in `src/components/admin/AdminNav.tsx`
3. Register the route in `src/routes.tsx` under the `/admin` parent
4. Add a backend function `netlify/functions/admin-<feature>.ts` calling `requireAdmin(req)` first
5. Use `adminFetch()` from the page to call it

Manually-added teams (admin) skip Stripe and are inserted with `status='confirmed'` directly.

## Key data model facts

- `divisions.team_size` is a generated column derived from `divisions.format` (doubles→2, triples→3, quads→4, sixes→6). Never store or pass team size manually.
- Teams go through: `pending_payment` → `confirmed` (or `waitlisted` / `cancelled`). The `cleanup-pending-teams` scheduled function cancels stale `pending_payment` teams after 24 hours.
- Roster management uses a UUID token (the `team_id`) as a magic link — no auth.

## CI / Deploy pipeline

| Environment    | Trigger         | Stripe                                                            |
| -------------- | --------------- | ----------------------------------------------------------------- |
| Local          | `netlify dev`   | Test keys from `.env.local`                                       |
| Deploy preview | Any branch push | Test keys (set in Netlify dashboard for `deploy-preview` context) |
| Production     | Merge to `main` | Live keys (set in Netlify dashboard for `production` context)     |

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck → lint → build on every push.

## Stripe test card

`4242 4242 4242 4242` — any future date, any CVC.
