#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DEPLOY_DOMAIN:-mypartypancakes.ru}"

echo "1. Checking container isolation & health..."
status="$(docker inspect rob-run-scan --format '{{.State.Health.Status}}' 2>/dev/null || echo 'starting')"
binds="$(docker inspect rob-run-scan --format '{{json .HostConfig.Binds}}')"
ports="$(docker inspect rob-run-scan --format '{{json .NetworkSettings.Ports}}')"
echo "   rob-run-scan health=$status binds=$binds ports=$ports"

if [[ "$binds" != "null" && "$binds" != "[]" ]]; then
  echo "Unexpected host volume bind on rob-run-scan: $binds" >&2
  exit 1
fi

curl -fsS http://127.0.0.1:13787/api/health >/dev/null
curl -fsS http://127.0.0.1:13787/api/rob-run/servers >/dev/null

echo "2. Checking Nginx virtual host ($DOMAIN)..."
if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  code_root="$(curl -s -o /dev/null -w '%{http_code}' --resolve "${DOMAIN}:443:127.0.0.1" -k "https://${DOMAIN}/")"
  code_hub="$(curl -s -o /dev/null -w '%{http_code}' --resolve "${DOMAIN}:443:127.0.0.1" -k "https://${DOMAIN}/rob-run-boost/")"
  code_calc="$(curl -s -o /dev/null -w '%{http_code}' --resolve "${DOMAIN}:443:127.0.0.1" -k "https://${DOMAIN}/rob-run-calc/")"
else
  code_root="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" http://127.0.0.1/)"
  code_hub="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" http://127.0.0.1/rob-run-boost/)"
  code_calc="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" http://127.0.0.1/rob-run-calc/)"
fi
echo "   / -> $code_root, /rob-run-boost/ -> $code_hub, /rob-run-calc/ -> $code_calc"
[[ "$code_root" == "302" && "$code_hub" == "200" && "$code_calc" == "200" ]]

echo "3. Checking neighbor services untouched..."
if [[ -d /opt/ksk-direct ]]; then
  systemctl is-active --quiet ksk-collect.timer ksk-analyze.timer
  echo "   ksk-direct timers: active"
fi
if docker inspect finance >/dev/null 2>&1; then
  fin_health="$(docker inspect finance --format '{{.State.Health.Status}}')"
  echo "   finance container: $fin_health"
  [[ "$fin_health" == "healthy" ]]
fi
default_code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)"
echo "   default_server (:80) -> $default_code"
[[ "$default_code" == "200" ]]

echo "All isolation & endpoint checks passed."
