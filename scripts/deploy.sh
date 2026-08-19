#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-/etc/grc-crm.env}"
SERVICE_NAME="${SERVICE_NAME:-grc-crm}"
SYSTEMCTL_BIN="${SYSTEMCTL_BIN:-/usr/bin/systemctl}"

if [[ "$(id -un)" != "webapps" ]]; then
  echo "This script must be run as the webapps user." >&2
  exit 1
fi

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Cannot read $ENV_FILE." >&2
  exit 1
fi

cd "$APP_DIR"

git pull --ff-only
npm ci

set -a
. "$ENV_FILE"
set +a

rm -rf .next
npm run build

if ! sudo -n "$SYSTEMCTL_BIN" restart "$SERVICE_NAME"; then
  echo "Unable to restart $SERVICE_NAME without a sudo password." >&2
  echo "Allow webapps to run: $SYSTEMCTL_BIN restart $SERVICE_NAME" >&2
  exit 1
fi
