#!/bin/bash
# Free ports and disable Fedora's default listen 80 so only 4187 is used.
set -euo pipefail

systemctl stop nginx >/dev/null 2>&1 || true
# Leftover workers can keep 80/4187 after a failed start.
pkill -x nginx >/dev/null 2>&1 || true
sleep 1
if pgrep -x nginx >/dev/null 2>&1; then
  pkill -9 -x nginx >/dev/null 2>&1 || true
  sleep 1
fi

MAIN=/etc/nginx/nginx.conf
if [[ -f "$MAIN" ]] && grep -Eq '^[[:space:]]*listen[[:space:]]+80\b|^[[:space:]]*listen[[:space:]]+\[::\]:80\b' "$MAIN"; then
  if [[ ! -f "${MAIN}.exoticpets-orig" ]]; then
    cp -a "$MAIN" "${MAIN}.exoticpets-orig"
  fi
  tmp="$(mktemp)"
  awk '
    /^[[:space:]]*listen[[:space:]]+80([^0-9]|$)/ && $0 !~ /^[[:space:]]*#/ { print "#" $0; next }
    /^[[:space:]]*listen[[:space:]]+\[::\]:80([^0-9]|$)/ && $0 !~ /^[[:space:]]*#/ { print "#" $0; next }
    { print }
  ' "$MAIN" > "$tmp"
  install -m 644 "$tmp" "$MAIN"
  rm -f "$tmp"
fi

# Stock welcome vhost, if present.
if [[ -f /etc/nginx/conf.d/default.conf ]]; then
  mv -f /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.exoticpets-disabled
fi
