#!/usr/bin/env bash
# Local dev orchestrator. Builds + runs pocketbase and graphhopper-api in
# podman, in the background. Idempotent — re-running is a no-op when both
# are already up.
#
# Usage:
#   ./dev.sh                  # start both (default)
#   ./dev.sh stop             # stop both
#   ./dev.sh status           # show container state
#   ./dev.sh logs <name>      # tail logs for pocketbase|graphhopper
#   ./dev.sh rebuild          # stop, remove, rebuild image, restart

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

PB_NAME=pocketbase
PB_IMAGE=vnext-pocketbase
PB_CTX="$DIR/pocketbase"
PB_DATA="$DIR/pocketbase/data/pb_data"

GH_NAME=graphhopper
GH_IMAGE=vnext-graphhopper
GH_CTX="$DIR/graphhopper-api"
GH_DATA="$DIR/graphhopper-api/data"
GH_CACHE="$DIR/graphhopper-api/graphhopper-cache"

_running() { [ -n "$(podman ps     --quiet --filter "name=^${1}$" 2>/dev/null)" ]; }
_exists()  { [ -n "$(podman ps -a  --quiet --filter "name=^${1}$" 2>/dev/null)" ]; }

_start_pocketbase() {
  if _running "$PB_NAME"; then echo "$PB_NAME: already running"; return; fi
  if _exists "$PB_NAME"; then
    echo "$PB_NAME: starting existing container"
    podman start "$PB_NAME" >/dev/null
    return
  fi
  echo "$PB_NAME: building image"
  podman build -t "$PB_IMAGE" "$PB_CTX"
  mkdir -p "$PB_DATA"
  echo "$PB_NAME: starting container on :8090"
  podman run -d \
    --name "$PB_NAME" \
    -p 8090:8090 \
    -v "$PB_DATA:/pb/pb_data:Z" \
    --restart unless-stopped \
    "$PB_IMAGE" >/dev/null
}

_start_graphhopper() {
  if _running "$GH_NAME"; then echo "$GH_NAME: already running"; return; fi
  if _exists "$GH_NAME"; then
    echo "$GH_NAME: starting existing container"
    podman start "$GH_NAME" >/dev/null
    return
  fi
  echo "$GH_NAME: building image"
  podman build -t "$GH_IMAGE" "$GH_CTX"
  mkdir -p "$GH_DATA" "$GH_CACHE"
  echo "$GH_NAME: starting container on :8989 (graph build can take ~25 min on first boot)"
  podman run -d \
    --name "$GH_NAME" \
    -p 8989:8989 \
    -p 8990:8990 \
    -v "$GH_DATA:/graphhopper/data:Z" \
    -v "$GH_CACHE:/graphhopper/graphhopper-cache:Z" \
    --restart unless-stopped \
    "$GH_IMAGE" >/dev/null
}

_stop_one() {
  if _running "$1"; then
    echo "stopping $1"
    podman stop "$1" >/dev/null
  fi
}

_remove_one() {
  if _exists "$1"; then
    podman rm -f "$1" >/dev/null
  fi
}

case "${1:-start}" in
  start)
    _start_pocketbase
    _start_graphhopper
    echo
    podman ps --filter "name=^${PB_NAME}$" --filter "name=^${GH_NAME}$"
    ;;
  stop)
    _stop_one "$PB_NAME"
    _stop_one "$GH_NAME"
    ;;
  status)
    podman ps -a --filter "name=^${PB_NAME}$" --filter "name=^${GH_NAME}$"
    ;;
  logs)
    name="${2:-}"
    if [ -z "$name" ]; then
      echo "Usage: $0 logs <${PB_NAME}|${GH_NAME}>" >&2
      exit 1
    fi
    podman logs -f "$name"
    ;;
  rebuild)
    _stop_one "$PB_NAME"; _remove_one "$PB_NAME"; podman rmi -f "$PB_IMAGE" 2>/dev/null || true
    _stop_one "$GH_NAME"; _remove_one "$GH_NAME"; podman rmi -f "$GH_IMAGE" 2>/dev/null || true
    "$0" start
    ;;
  *)
    echo "Usage: $0 [start|stop|status|logs <name>|rebuild]" >&2
    exit 1
    ;;
esac
