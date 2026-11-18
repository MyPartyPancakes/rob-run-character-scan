#!/usr/bin/env bash
set -euo pipefail

# Isolated setup for ROB RUN Character Scan.
# Never modifies /opt/ksk-direct, /opt/finance, /opt/delivery-demo, or default Nginx vhosts.
APP=/opt/rob-run-scan/app
DOMAIN="${DEPLOY_DOMAIN:-mypartypancakes.ru}"
VHOST="/etc/nginx/sites-available/${DOMAIN}.conf"
VHOST_LINK="/etc/nginx/sites-enabled/${DOMAIN}.conf"
CERT_FULLCHAIN="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

for protected in /opt/ksk-direct /opt/finance /opt/delivery-demo; do
  if [[ "$APP" == "$protected"* ]]; then
    echo "Refusing to touch protected directory: $protected" >&2
    exit 1
  fi
done

if [[ ! -f "$APP/docker-compose.yml" ]]; then
  echo "Missing $APP/docker-compose.yml" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y docker.io docker-compose-v2
  systemctl enable --now docker
fi

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is required on the host" >&2
  exit 1
fi

mkdir -p /var/www/certbot
chmod 755 /var/www/certbot

cd "$APP"
docker compose up -d --build --remove-orphans

ok=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:13787/api/health >/dev/null; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "$ok" != 1 ]]; then
  docker compose logs --tail=80
  exit 1
fi

if [[ -f "$CERT_FULLCHAIN" ]]; then
  install -m 644 "$APP/deploy/nginx-https.conf" "$VHOST"
else
  install -m 644 "$APP/deploy/nginx-http.conf" "$VHOST"
fi
ln -sfn "$VHOST" "$VHOST_LINK"

nginx -t
systemctl reload nginx

sed -i 's/\r$//' "$APP/deploy/verify.sh"
bash "$APP/deploy/verify.sh"
