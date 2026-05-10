# Volley Monster — Agent Reference

Outdoor grass volleyball tournament registration app. Captains register teams, pay via Stripe Checkout, and manage their roster via a magic-link page. Supports season passes for multi-tournament entry.

## Stack

| Layer              | Technology                                                  |
| ------------------ | ----------------------------------------------------------- |
| Frontend           | React 19, Vite, TypeScript, Tailwind CSS v4                 |
| Routing            | React Router v7                                             |
| Data fetching      | TanStack Query v5                                           |
| Forms / validation | React Hook Form, Zod v4                                     |
| Backend            | Hono (Node.js, `tsx` runtime — no build step for the API)   |
| Database           | PostgreSQL via `pg` — raw SQL with tagged template literals |
| Payments           | Stripe Checkout (hosted redirect) + Stripe webhooks         |
| Email              | Resend API                                                  |
| Toasts             | Sonner                                                      |
| Deployment         | Docker Compose + Traefik on a VPS; images hosted on GHCR    |

No Netlify. No Supabase. No Vercel. No ORM.

## Directory layout

```
api/
  index.ts              # Hono app — mounts all routes, starts HTTP server
  migrate.ts            # Runs pending SQL migrations on startup
  cron.ts               # Scheduled jobs (cleanup-pending-teams @hourly)
server/
  routes/               # One file per endpoint
    _lib/
      db.ts             # getDatabase() — pg Pool singleton
      stripe.ts         # Stripe client singleton
      admin-auth.ts     # requireAdmin(req) — checks x-admin-token header
    tournaments.ts          GET /api/tournaments
    tournament.ts           GET /api/tournament?slug=
    create-checkout-session.ts  POST /api/create-checkout-session
    create-season-pass-checkout.ts  POST /api/create-season-pass-checkout
    stripe-webhook.ts       POST /api/stripe-webhook
    confirm-registration.ts GET /api/confirm-registration?session_id=
    confirm-season-pass.ts  GET /api/confirm-season-pass?session_id=
    manage-team.ts          GET /api/manage-team?token=
    manage-team-update-player.ts  POST /api/manage-team-update-player
    division-teams.ts       GET /api/division-teams?division_id=
    validate-pass-code.ts   POST /api/validate-pass-code
    send-confirmation-email-background.ts
    send-season-pass-email.ts
    cleanup-pending-teams.ts
    seed-dev.ts             POST /api/seed-dev  (dev-only, returns 403 in prod)
    health.ts               GET /api/health
    admin-teams.ts          GET/POST/DELETE /api/admin/teams
    admin-season-passes.ts  GET /api/admin/season-passes
src/
  api/                  # Zod schemas + fetch wrappers + TanStack Query hooks
  features/
    registration/       # Multi-step registration flow
    manage/             # Roster editing (ManageTeamPage)
  pages/
    admin/              # AdminLayout, AdminDashboard, AdminTeams, AdminSeasonPasses
    manage/             # ManageTeamPage
    (other pages at root level)
  components/
    admin/              # AdminLogin, AdminNav
  lib/
    admin.ts            # Token storage + adminFetch() wrapper
    teamName.ts         # autoTeamName(players) — derives name from player names
    schemas/
      registration.ts   # Zod schema shared by frontend and create-checkout-session
  routes.tsx            # React Router route definitions
deploy/
  Dockerfile.api        # Multi-stage: deps → build SPA → runtime (tsx + node_modules)
  Dockerfile.web        # nginx serving the compiled SPA
  docker-compose.yml    # Production stack: postgres, migrate, api, web, traefik
  docker-compose.dev.yml    # Local Postgres only
  docker-compose.preview.yml
  bootstrap.sh          # One-time VPS setup (Docker, deploy user, firewall)
  INSTALL.md            # Full VPS deployment guide
```

## Local dev

```bash
npm run dev:db       # Start local Postgres (Docker)
npm run db:migrate   # Apply pending migrations
npm run db:seed      # Seed with fake data

# Two terminals:
npm run api:dev      # Hono API on :3000 with hot reload (tsx watch)
npm run dev          # Vite SPA on :5173 with HMR

# Third terminal if testing payments:
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

`.env.local` needs: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_SITE_URL=http://localhost:5173`, `VITE_STRIPE_PUBLISHABLE_KEY`, `ADMIN_TOKEN`.

## Database migrations

Schema lives in `deploy/` — check the Dockerfile and migrate.ts for how migrations are discovered and applied. To add a schema change: create a new migration SQL file, then run `npm run db:migrate` locally to test it.

## Key data model facts

- `divisions.team_size` is a generated column derived from `divisions.format` (doubles→2, triples→3, quads→4, sixes→6). Never store or pass team size manually.
- Teams go through: `pending_payment` → `confirmed` (or `waitlisted` / `cancelled`). The `cleanup-pending-teams` cron cancels stale `pending_payment` teams after 24 hours.
- `teams.name` is **always derived** from full player names joined with `/` — there is no manual team-name input. Use `autoTeamName(players)` from `src/lib/teamName.ts`. The DB has `UNIQUE (division_id, name)`; if two teams derive the same name, the second insert returns `team_name_taken` and the captain must disambiguate (e.g. add a middle initial).
- `create-checkout-session.ts` reclaims any stale `pending_payment` row matching `(division, lower(name), lower(captain_email))` before insert, so retries don't trip the unique constraint.
- Roster management uses the `team_id` UUID as a magic-link token — no auth.
- Season passes use a separate checkout flow and their own confirmation/email routes.

## Admin

Token-gated UI at `/admin`. Token is set via `ADMIN_TOKEN` env var; entered once per session at `/admin/login` and stored in `sessionStorage`.

```
src/pages/admin/           AdminLayout (auth gate + nav), AdminDashboard, AdminTeams, AdminSeasonPasses
src/components/admin/      AdminLogin, AdminNav
src/lib/admin.ts           Token storage + adminFetch() (sends x-admin-token header)
server/routes/_lib/admin-auth.ts   requireAdmin(req) — returns 401/503 or null
server/routes/admin-*.ts   Backend endpoints under /api/admin/*
```

To add a new admin feature:

1. Add page under `src/pages/admin/`
2. Add link in `src/components/admin/AdminNav.tsx`
3. Register route in `src/routes.tsx` under the `/admin` parent
4. Add `server/routes/admin-<feature>.ts` calling `requireAdmin(req)` first
5. Use `adminFetch()` from the page to call it

Manually-added teams (admin) skip Stripe and are inserted with `status='confirmed'` directly.

## CI / Deploy pipeline

| Environment | Trigger           | Stripe keys          |
| ----------- | ----------------- | -------------------- |
| Local       | `npm run api:dev` | Test (`.env.local`)  |
| Preview     | Push to `preview` | Test (GitHub secret) |
| Production  | Push to `master`  | Live (GitHub secret) |

GitHub Actions (`.github/workflows/`):

- `ci.yml` — typecheck, lint, format, build on every push
- `deploy.yml` — builds + pushes Docker images to GHCR, SCPs `docker-compose.yml` to VPS, SSHes in and runs `docker compose pull && docker compose up -d`
- `preview.yml` — same flow for the `preview` branch, runs Playwright smoke tests after deploy
- `_ci-checks.yml` — shared reusable job called by both ci and preview workflows

Required GitHub repo secrets: `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN` (optional), `VITE_STRIPE_PUBLISHABLE_KEY_PREVIEW`.

### VPS layout: prod and preview share traefik

Both stacks run on the same VPS. Production owns traefik (terminates TLS, issues Let's Encrypt certs); preview reuses it. They communicate via an external Docker network `traefik-public` that both compose projects join. Postgres in each project stays on its project-private `default` network — the two databases cannot see each other and traefik cannot reach them.

One-time setup before the first preview deploy:

```bash
docker network create traefik-public
```

After that, deploys are independent — `docker compose -f docker-compose.yml up -d` (prod) and `docker compose -f docker-compose.preview.yml --env-file .env.preview up -d` (preview) don't touch each other.

### Env files on the VPS

| File                              | Purpose                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `/opt/volleymonster/.env`         | Production. `DOMAIN=`, live Stripe keys, prod admin token    |
| `/opt/volleymonster/.env.preview` | Preview. `PREVIEW_DOMAIN=`, test Stripe keys, separate token |

`.env.preview` required keys: `GHCR_OWNER`, `POSTGRES_PASSWORD`, `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET` (from a Stripe webhook endpoint pointing at `https://${PREVIEW_DOMAIN}/api/stripe-webhook`), `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_TOKEN`, `PREVIEW_DOMAIN`. Use a different `POSTGRES_PASSWORD` and `ADMIN_TOKEN` than production.

### Seeding the preview database

`api/seed.ts` is a one-shot CLI script bundled into the api image. It is **not** registered in `api/index.ts`'s router — there is no HTTP route, so it has zero internet surface. Invoke it via the matching `seed` service (which uses `profiles: ['manual']` so it never auto-starts):

```bash
cd /opt/volleymonster
docker compose -f deploy/docker-compose.preview.yml --env-file .env.preview \
  run --rm seed
```

Idempotent — `seed-dev.sql` deletes prior `@test.vm` rows before inserting. Refuses to run unless `ALLOW_SEED=true` is set (already wired into the preview compose's `seed` service env). Production has no `seed` service; do not add one.

## Stripe test card

`4242 4242 4242 4242` — any future date, any CVC.
