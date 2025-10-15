#!/usr/bin/env sh
set -eu

# Render nginx.conf from template with $DOMAIN
envsubst '${DOMAIN}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf

CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
FULLCHAIN="${CERT_DIR}/fullchain.pem"
PRIVKEY="${CERT_DIR}/privkey.pem"

# Wait until certs exist (certbot service will create them)
echo "Waiting for certificate files at ${CERT_DIR} ..."
while [ ! -f "${FULLCHAIN}" ] || [ ! -f "${PRIVKEY}" ]; do
  sleep 1
done
echo "Found certs, starting nginx."

# Start a background watcher that reloads nginx when certs change (renewals)
(
  while inotifywait -e close_write,create,move,delete "${CERT_DIR}"; do
    echo "Cert files changed, reloading nginx..."
    nginx -s reload || true
  done
) &

# Run nginx in foreground
exec nginx -g "daemon off;"
