#!/bin/bash
# Write /etc/nginx/conf.d/exoticpets.conf from /etc/exoticpets/site.env.
# Does not reload nginx. Run nginx -t and systemctl reload nginx afterward.
set -euo pipefail

ENV_FILE=/etc/exoticpets/site.env
TEMPLATE=/usr/share/exoticpets/nginx/exoticpets.conf.template
OUT=/etc/nginx/conf.d/exoticpets.conf

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi
if [[ ! -f "$TEMPLATE" ]]; then
  echo "Missing $TEMPLATE" >&2
  exit 1
fi

cleaned="$(mktemp)"
trap 'rm -f "$cleaned"' EXIT
tr -d '\r' < "$ENV_FILE" > "$cleaned"

set -a
# shellcheck disable=SC1090
source "$cleaned"
set +a

: "${LISTEN_PORT:?LISTEN_PORT is not set in $ENV_FILE}"
: "${BACKEND_URL:?BACKEND_URL is not set in $ENV_FILE}"

generated="$(mktemp)"
trap 'rm -f "$cleaned" "$generated"' EXIT
envsubst '${LISTEN_PORT} ${BACKEND_URL}' < "$TEMPLATE" > "$generated"
install -m 644 "$generated" "$OUT"
echo "Wrote $OUT"
