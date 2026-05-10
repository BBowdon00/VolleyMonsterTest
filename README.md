# Volley Monster

Outdoor grass volleyball tournament registration app. Captains register teams, pay via Stripe Checkout, and manage their roster via a magic-link page. Supports season passes for multi-tournament entry.

## Local Development

Requires Node 22+, Docker (for local Postgres).

```bash
# Install dependencies
npm install

# Start local Postgres
npm run dev:db

# Apply migrations
npm run db:migrate

# Seed with fake data
npm run db:seed

# Start API (hot reload)
npm run api:dev

# Start frontend (separate terminal)
npm run dev
```

The API runs on `http://localhost:3000`, the frontend on `http://localhost:5173`.

To test Stripe webhooks locally, run the Stripe CLI in a third terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
# Copy the printed whsec_... into .env.local as STRIPE_WEBHOOK_SECRET
```

### Environment variables (`.env.local`)

| Variable                      | Notes                                                       |
| ----------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`                | `postgres://volleymonster:dev@localhost:5432/volleymonster` |
| `STRIPE_SECRET_KEY`           | `sk_test_...`                                               |
| `STRIPE_WEBHOOK_SECRET`       | From `stripe listen` output                                 |
| `RESEND_API_KEY`              | From Resend dashboard                                       |
| `EMAIL_FROM`                  | e.g. `noreply@volleymonster.com`                            |
| `PUBLIC_SITE_URL`             | `http://localhost:5173`                                     |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...`                                               |
| `ADMIN_TOKEN`                 | Any random string                                           |

## Key Commands

```bash
npm run dev          # Vite frontend dev server
npm run api:dev      # Hono API with hot reload (tsx watch)
npm run dev:db       # Start local Postgres via Docker Compose
npm run db:migrate   # Apply pending migrations
npm run db:seed      # Seed local DB with fake data
npm run build        # Production build (tsc + vite)
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run format       # Prettier (write)
npm test             # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
```

## Deployment

The app runs on a VPS with Docker Compose + Traefik. CI/CD is handled by GitHub Actions — pushing to `master` builds Docker images, pushes to GHCR, and deploys to the VPS automatically.

### Quick deploy reference

| Action                | How                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Deploy to prod        | Push to `master` (or trigger Actions → Deploy manually)                                      |
| Deploy to preview     | Push to `preview` branch                                                                     |
| View prod logs        | `ssh deploy@<VPS_IP>` then `docker compose -f /opt/volleymonster/docker-compose.yml logs -f` |
| Redeploy compose only | SCP `deploy/docker-compose.yml` to `/opt/volleymonster/` then `docker compose up -d`         |

### VPS `.env` required variables

```env
POSTGRES_PASSWORD=<strong-random>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@volleymonster.com
PUBLIC_SITE_URL=https://volleymonster.com
ADMIN_TOKEN=<strong-random>
LE_EMAIL=you@example.com
DOMAIN=volleymonster.com
GHCR_OWNER=<github-username-lowercase>
```

See [`deploy/INSTALL.md`](deploy/INSTALL.md) for full VPS setup instructions including DNS, bootstrap, GitHub secrets, and preview environment setup.

## Stripe Test Card

`4242 4242 4242 4242` — any future date, any CVC.

## Admin

Visit `/admin` and enter the `ADMIN_TOKEN` value. The token is stored in `sessionStorage` for the duration of the browser session.
