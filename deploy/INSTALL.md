# VPS Deployment Guide

Targets Ubuntu 24.04. Traefik handles TLS automatically via Let's Encrypt.

---

## 1. DNS

Point both records to your VPS IP before starting — Traefik needs them resolvable for the ACME challenge.

```
A  volleymonster.com      <VPS_IP>
A  www.volleymonster.com  <VPS_IP>
```

---

## 2. Bootstrap the VPS

Run once as root on a fresh droplet:

```bash
SSH_PUBKEY="ssh-ed25519 AAAA..." \
bash deploy/bootstrap.sh
```

This installs Docker, creates a `deploy` user with your SSH key, and opens ports 22/80/443.

---

## 3. Place files on the server

```bash
scp deploy/docker-compose.yml deploy@<VPS_IP>:/opt/volleymonster/docker-compose.yml
```

Create `/opt/volleymonster/.env`:

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
GHCR_OWNER=<your-github-username-lowercase>
```

`TAG` is injected by CI and does not belong in `.env`. `GHCR_OWNER` is also injected by CI but must be in `.env` for manual `docker compose` commands on the VPS.

---

## 4. GitHub repository secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret                        | Value                                           |
| ----------------------------- | ----------------------------------------------- |
| `DROPLET_HOST`                | VPS IP or hostname                              |
| `DROPLET_USER`                | `deploy`                                        |
| `DROPLET_SSH_KEY`             | Private key matching the public key from step 2 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...`                                   |
| `VITE_SENTRY_DSN`             | Sentry DSN (or leave empty)                     |

---

## 5. Deploy

Push to `master` (or trigger **Actions → Deploy → Run workflow**). The workflow:

1. Builds and pushes `volleymonster-api` and `volleymonster-web` to GHCR
2. SSHes into the VPS and runs `docker compose pull && docker compose up -d`

Traefik provisions the TLS certificate on the first request. Allow 30–60 seconds after startup before hitting the site.

---

## Preview environment

A `preview` branch deploys to `preview.volleymonster.com` on the same VPS, using separate containers and a separate database. Stripe test keys are baked into the preview image.

### One-time setup

**DNS** — add an A record pointing to the same VPS IP:

```
A  preview.volleymonster.com  <VPS_IP>
```

**`.env.preview`** on the VPS at `/opt/volleymonster/.env.preview`:

```env
POSTGRES_PASSWORD=<strong-random-different-from-prod>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@volleymonster.com
ADMIN_TOKEN=<strong-random>
```

**GitHub secret** — add `VITE_STRIPE_PUBLISHABLE_KEY_PREVIEW` with your `pk_test_...` key.

### Workflow

Push to the `preview` branch → CI checks → build images tagged `preview` → deploy → Playwright smoke tests run automatically against the live preview URL.

---

## Ongoing operations

**Redeploy:** push to `master` or trigger the workflow manually.

**View logs:**

```bash
ssh deploy@<VPS_IP>
docker compose -f /opt/volleymonster/docker-compose.yml logs -f
```

**Update `docker-compose.yml`** (after changing routing, env vars, etc.):

```bash
scp deploy/docker-compose.yml deploy@<VPS_IP>:/opt/volleymonster/docker-compose.yml
ssh deploy@<VPS_IP> "cd /opt/volleymonster && docker compose up -d"
```
