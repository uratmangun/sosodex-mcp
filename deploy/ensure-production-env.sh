#!/usr/bin/env bash
# Run on VPS after copying .env.local: bash deploy/ensure-production-env.sh /home/ubuntu/apps/google-map-test/.env.local
set -euo pipefail

ENV_FILE="${1:-/home/ubuntu/apps/google-map-test/.env.local}"
PROD_ORIGIN="https://maps.uratmangun.ovh"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set_kv() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

set_kv BETTER_AUTH_URL "$PROD_ORIGIN"
set_kv NEXT_PUBLIC_GPT_APP_ORIGIN "$PROD_ORIGIN"
set_kv NEXT_PUBLIC_MCP_APP_ORIGIN "$PROD_ORIGIN"
# Pod network hostname (Next binds to pod IP, not 127.0.0.1)
set_kv MCP_CHAT_URL "http://termux-stack:3004/mcp"
set_kv MCP_INTERNAL_HOST "termux-stack"
set_kv DATABASE_PATH "/data/google-map-test.sqlite"
set_kv NODE_ENV "production"
set_kv NEXT_PUBLIC_POSTHOG_HOST "/ingest"
set_kv NEXT_PUBLIC_POSTHOG_UI_HOST "https://us.posthog.com"
if [[ -n "${NEXT_PUBLIC_POSTHOG_TOKEN:-}" ]]; then
  set_kv NEXT_PUBLIC_POSTHOG_TOKEN "$NEXT_PUBLIC_POSTHOG_TOKEN"
fi

chmod 600 "$ENV_FILE"
echo "Updated $ENV_FILE:"
grep -E '^(BETTER_AUTH_URL|NEXT_PUBLIC_GPT|MCP_CHAT|NEXT_PUBLIC_POSTHOG|MCP_CHAT_URL|DATABASE_PATH|NODE_ENV)=' "$ENV_FILE"
