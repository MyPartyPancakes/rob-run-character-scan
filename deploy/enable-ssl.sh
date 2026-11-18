#!/usr/bin/env bash
set -euo pipefail

# Issues Let's Encrypt TLS certificate via webroot and activates HTTPS Nginx config.
APP=/opt/rob-run-scan/app
DOMAIN="${DEPLOY_DOMAIN:-mypartypancakes.ru}"
WWW_DOMAIN="www.${DOMAIN}"
VHOST="/etc/nginx/sites-available/${DOMAIN}.conf"
VHOST_LINK="/etc/nginx/sites-enabled/${DOMAIN}.conf"
HOOK="/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"

SERVER_IPV4="$(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | head -n1)"
DNS_A="$(dig +short A "$DOMAIN" @8.8.8.8 | tail -n1)"
DNS_AAAA="$(dig +short AAAA "$DOMAIN" @8.8.8.8 | tail -n1)"
WWW_A="$(dig +short A "$WWW_DOMAIN" @8.8.8.8 | tail -n1)"
WWW_AAAA="$(dig +short AAAA "$WWW_DOMAIN" @8.8.8.8 | tail -n1)"

echo "Server IPv4 : $SERVER_IPV4"
echo "$DOMAIN A   : ${DNS_A:-<empty>}"
echo "$DOMAIN AAAA: ${DNS_AAAA:-<empty>}"
echo "$WWW_DOMAIN A: ${WWW_A:-<empty>}"

if [[ "$DNS_A" != "$SERVER_IPV4" ]]; then
  echo "ERROR: $DOMAIN A record ($DNS_A) does not match server IPv4 ($SERVER_IPV4) yet." >&2
  exit 2
fi

if [[ -n "$DNS_AAAA" ]]; then
  echo "ERROR: $DOMAIN still has AAAA record ($DNS_AAAA), which blocks Let's Encrypt on IPv4-only server." >&2
  exit 3
fi

DOMAINS=(-d "$DOMAIN")
if [[ "$WWW_A" == "$SERVER_IPV4" && -z "$WWW_AAAA" ]]; then
  DOMAINS+=(-d "$WWW_DOMAIN")
fi

mkdir -p /var/www/certbot /etc/letsencrypt/renewal-hooks/deploy

certbot certonly \
  --webroot -w /var/www/certbot \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --keep-until-expiring \
  --expand \
  "${DOMAINS[@]}"

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
systemctl reload nginx
EOF
chmod +x "$HOOK"

install -m 644 "$APP/deploy/nginx-https.conf" "$VHOST"
ln -sfn "$VHOST" "$VHOST_LINK"

nginx -t
systemctl reload nginx
systemctl enable --now certbot.timer || true

curl -fsSI --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/rob-run-calc/" | head -n 5
echo "SSL enabled successfully for ${DOMAIN}"
