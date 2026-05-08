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
```

`GHCR_OWNER` and `TAG` are injected by CI and do not belong in `.env`.

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

Push to `main` (or trigger **Actions → Deploy → Run workflow**). The workflow:

1. Builds and pushes `volleymonster-api` and `volleymonster-web` to GHCR
2. SSHes into the VPS and runs `docker compose pull && docker compose up -d`

Traefik provisions the TLS certificate on the first request. Allow 30–60 seconds after startup before hitting the site.

---

## Ongoing operations

**Redeploy:** push to `main` or trigger the workflow manually.

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
