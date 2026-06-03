#!/usr/bin/env bash
# Build sosodex-mcp image locally, transfer to VPS, podman load.
# Usage: bash deploy/push-image-to-vps.sh [ubuntu@100.117.130.2]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${1:-ubuntu@100.117.130.2}"
IMAGE="localhost/sosodex-mcp:latest"
TAR="/tmp/sosodex-mcp-$(date +%Y%m%d%H%M%S).tar"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

POSTHOG="${NEXT_PUBLIC_POSTHOG_TOKEN:-}"
if [[ -z "$POSTHOG" ]]; then
  echo "NEXT_PUBLIC_POSTHOG_TOKEN is not set in $ENV_FILE" >&2
  exit 1
fi

echo "Building $IMAGE (PostHog token ${#POSTHOG} chars)..."
podman build \
  --build-arg "NEXT_PUBLIC_POSTHOG_TOKEN=${POSTHOG}" \
  --build-arg "BETTER_AUTH_URL=https://sosodex.uratmangun.ovh" \
  --build-arg "NEXT_PUBLIC_MCP_APP_ORIGIN=https://sosodex.uratmangun.ovh" \
  -t "$IMAGE" \
  .

echo "Saving image to $TAR ..."
podman save -o "$TAR" "$IMAGE"

echo "Copying to $REMOTE ..."
scp "$TAR" "$REMOTE:/tmp/sosodex-mcp.tar"

echo "Loading on remote ..."
ssh "$REMOTE" "podman load -i /tmp/sosodex-mcp.tar && rm -f /tmp/sosodex-mcp.tar"

rm -f "$TAR"

echo "Ensuring SQLite data volume is writable and restarting ..."
ssh "$REMOTE" 'mkdir -p ~/apps/sosodex-mcp/data
  sudo chmod 1777 ~/apps/sosodex-mcp/data
  sudo chmod -R a+rwX ~/apps/sosodex-mcp/data 2>/dev/null || true
  systemctl --user restart sosodex-mcp.service'

echo "Done. Image loaded as $IMAGE on $REMOTE"
