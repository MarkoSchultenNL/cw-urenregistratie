#!/usr/bin/env bash
# Eenmalige inrichting van een Ubuntu/Debian-server (Hetzner) voor CW Urenregistratie.
# Draai als root:  bash setup-server.sh uren-staging.jouwdomein.nl
set -euo pipefail

DOMAIN="${1:?Gebruik: setup-server.sh <domein>}"
REPO="https://github.com/MarkoSchultenNL/cw-urenregistratie.git"
DIR=/opt/cw-urenregistratie
DEPLOY_USER=deploy

echo "== Docker installeren (indien nodig)"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "== Deploy-gebruiker aanmaken"
id -u $DEPLOY_USER >/dev/null 2>&1 || adduser --disabled-password --gecos "" $DEPLOY_USER
usermod -aG docker $DEPLOY_USER

echo "== Repo klonen naar $DIR"
if [ ! -d $DIR/.git ]; then
  git clone --depth=1 $REPO $DIR
fi
chown -R $DEPLOY_USER:$DEPLOY_USER $DIR

echo "== .env aanmaken"
if [ ! -f $DIR/.env ]; then
  SECRET=$(openssl rand -hex 32)
  ADMIN_PW=$(openssl rand -base64 12 | tr -d '=+/' | cut -c1-14)
  cat > $DIR/.env <<EOF
APP_URL=https://$DOMAIN
DOMAIN=$DOMAIN
SESSION_SECRET=$SECRET
DATABASE_PATH=/data/cw.sqlite
TENANT_NAME=Staging

ADMIN_EMAIL=admin@$DOMAIN
ADMIN_PASSWORD=$ADMIN_PW

TEAMLEADER_CLIENT_ID=
TEAMLEADER_CLIENT_SECRET=
TEAMLEADER_MOCK=1
EOF
  chown $DEPLOY_USER:$DEPLOY_USER $DIR/.env
  chmod 600 $DIR/.env
  echo "   Admin-login: admin@$DOMAIN / $ADMIN_PW   (staat in $DIR/.env)"
fi

echo "== SSH-sleutel voor GitHub Actions"
su - $DEPLOY_USER -c 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && [ -f ~/.ssh/github-actions ] || ssh-keygen -t ed25519 -N "" -C github-actions -f ~/.ssh/github-actions -q'
su - $DEPLOY_USER -c 'grep -qf ~/.ssh/github-actions.pub ~/.ssh/authorized_keys 2>/dev/null || cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys'

echo "== Firewall (ufw) openen voor 80/443 als ufw actief is"
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
fi

echo "== Eerste start"
cd $DIR && su $DEPLOY_USER -c "docker compose up -d --build"

cat <<EOF

========================================================================
Klaar. Zet deze drie secrets in GitHub (repo → Settings → Secrets → Actions):

  DEPLOY_HOST     $(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')
  DEPLOY_USER     $DEPLOY_USER
  DEPLOY_SSH_KEY  (de hele inhoud hieronder, inclusief BEGIN/END-regels)

------------------------------------------------------------------------
$(cat /home/$DEPLOY_USER/.ssh/github-actions)
------------------------------------------------------------------------

Daarna deployt elke push naar main automatisch.
App: https://$DOMAIN/admin   (certificaat komt vanzelf zodra DNS klopt)
========================================================================
EOF
