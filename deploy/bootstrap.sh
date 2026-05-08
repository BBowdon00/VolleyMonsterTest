#!/usr/bin/env bash
# First-boot setup for a fresh Ubuntu 24.04 DigitalOcean droplet.
# Run as root: bash deploy/bootstrap.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

# ── Args ─────────────────────────────────────────────────────────────────────
DEPLOY_USER="${DEPLOY_USER:-deploy}"
SSH_PUBKEY="${SSH_PUBKEY:-}"            # paste your public key into env

if [[ -z "$SSH_PUBKEY" ]]; then echo "SSH_PUBKEY env var is required." >&2; exit 1; fi

# ── 1. System update + firewall ──────────────────────────────────────────────
apt-get update
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── 2. Docker (official repo) ────────────────────────────────────────────────
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $codename stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# ── 3. Deploy user ───────────────────────────────────────────────────────────
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

mkdir -p "/home/$DEPLOY_USER/.ssh"
echo "$SSH_PUBKEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
chmod 700 "/home/$DEPLOY_USER/.ssh"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

# ── 4. App directory ─────────────────────────────────────────────────────────
mkdir -p /opt/volleymonster
touch /opt/volleymonster/.env /opt/volleymonster/.env.preview
chown -R "$DEPLOY_USER:$DEPLOY_USER" /opt/volleymonster
chmod 600 /opt/volleymonster/.env /opt/volleymonster/.env.preview

echo
echo "Done. Next steps:"
echo "  1. Place docker-compose.yml and .env at /opt/volleymonster/"
echo "     .env must include: POSTGRES_PASSWORD, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,"
echo "     RESEND_API_KEY, EMAIL_FROM, ADMIN_TOKEN, GHCR_OWNER, LE_EMAIL"
echo "  2. ssh as $DEPLOY_USER and run: docker compose pull && docker compose up -d"
echo "  Traefik will obtain the Let's Encrypt certificate automatically on first startup."
