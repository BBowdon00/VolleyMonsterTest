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
LE_EMAIL="${LE_EMAIL:-}"                # for Let's Encrypt
APEX_DOMAIN="${APEX_DOMAIN:-volleymonster.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.volleymonster.com}"

if [[ -z "$SSH_PUBKEY" ]]; then echo "SSH_PUBKEY env var is required." >&2; exit 1; fi
if [[ -z "$LE_EMAIL"  ]]; then echo "LE_EMAIL env var is required."   >&2; exit 1; fi

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
mkdir -p /opt/volleymonster/certbot/{www,conf}
chown -R "$DEPLOY_USER:$DEPLOY_USER" /opt/volleymonster

# ── 5. Bootstrap initial cert (standalone — runs before nginx exists) ────────
docker run --rm \
  -p 80:80 \
  -v /opt/volleymonster/certbot/conf:/etc/letsencrypt \
  -v /opt/volleymonster/certbot/www:/var/www/certbot \
  certbot/certbot certonly --standalone \
    -d "$APEX_DOMAIN" -d "$WWW_DOMAIN" \
    --email "$LE_EMAIL" --agree-tos --no-eff-email --non-interactive

echo
echo "Done. Next steps:"
echo "  1. Place docker-compose.yml and .env at /opt/volleymonster/"
echo "  2. ssh as $DEPLOY_USER and run: docker compose pull && docker compose up -d"
