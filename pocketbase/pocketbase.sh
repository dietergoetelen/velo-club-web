#!/usr/bin/env bash
# Downloads and runs PocketBase locally.
# Data is stored in ./pocketbase/data/
#
# Usage:
#   bash pocketbase/pocketbase.sh          # start
#   bash pocketbase/pocketbase.sh stop     # stop
#   bash pocketbase/pocketbase.sh logs     # tail logs
#   bash pocketbase/pocketbase.sh setup    # create collections (run once after first start)

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PB_VERSION="0.26.6"
ARCH="amd64"
BIN="$DIR/data/pocketbase"
PID_FILE="$DIR/data/pocketbase.pid"
LOG_FILE="$DIR/data/pocketbase.log"

mkdir -p "$DIR/data"

CMD="${1:-start}"

_stop() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    kill "$(cat "$PID_FILE")" && rm -f "$PID_FILE"
    echo "PocketBase stopped."
  else
    echo "PocketBase is not running."
  fi
}

case "$CMD" in
  stop)  _stop; exit 0 ;;
  logs)  tail -f "$LOG_FILE"; exit 0 ;;
  setup)
    echo "Running collection setup…"
    cd "$(dirname "$DIR")"
    npx tsx pocketbase/setup.ts
    exit 0
    ;;
esac

# Download binary if needed
if [ ! -f "$BIN" ]; then
  echo "Downloading PocketBase ${PB_VERSION}…"
  TMP=$(mktemp -d)
  curl -L --progress-bar \
    -o "$TMP/pb.zip" \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${ARCH}.zip"
  unzip -q "$TMP/pb.zip" -d "$TMP"
  mv "$TMP/pocketbase" "$BIN"
  chmod +x "$BIN"
  rm -rf "$TMP"
fi

_stop 2>/dev/null || true

echo "Starting PocketBase…"
nohup "$BIN" serve \
  --dir="$DIR/data/pb_data" \
  --http="127.0.0.1:8090" \
  > "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
echo "Started (PID $!)"
echo "Admin UI → http://localhost:8090/_/"
echo "Run 'bash pocketbase/pocketbase.sh setup' after first-time setup to create collections."
