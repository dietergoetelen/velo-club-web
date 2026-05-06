#!/usr/bin/env bash
# Local GraphHopper runner — no Docker required, needs Java 21+.
# OSM data and graph cache live in ./data/
#
# Usage:
#   bash graphhopper.sh           # start
#   bash graphhopper.sh stop      # stop
#   bash graphhopper.sh status    # check
#   bash graphhopper.sh logs      # tail logs
#   bash graphhopper.sh rebuild   # wipe cache and restart

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
GH_VERSION="11.0"
JAR="$DIR/data/graphhopper-web-${GH_VERSION}.jar"
PID_FILE="$DIR/data/graphhopper.pid"
LOG_FILE="$DIR/data/graphhopper.log"
OSM_FILE="$DIR/data/benelux-latest.osm.pbf"
BE_PBF="$DIR/data/belgium-latest.osm.pbf"
NL_PBF="$DIR/data/netherlands-latest.osm.pbf"
LU_PBF="$DIR/data/luxembourg-latest.osm.pbf"
# graph.location in config.yml is relative to $DIR (the JVM cwd), not data/.
CACHE_DIR="$DIR/graphhopper_cache"

mkdir -p "$DIR/data"

CMD="${1:-start}"

_stop() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Stopping GraphHopper (PID $(cat "$PID_FILE"))…"
    kill "$(cat "$PID_FILE")" && rm -f "$PID_FILE"
    echo "Stopped."
  else
    echo "GraphHopper is not running."
  fi
}

_download_country_pbf() {
  local name="$1"
  local target="$2"
  if [ -f "$target" ]; then
    return
  fi
  echo "Downloading ${name} OSM data…"
  curl -L --progress-bar \
    -o "$target.tmp" \
    "https://download.geofabrik.de/europe/${name}-latest.osm.pbf"
  mv "$target.tmp" "$target"
}

_build_benelux_pbf() {
  if [ -f "$OSM_FILE" ]; then
    return
  fi

  _download_country_pbf belgium     "$BE_PBF"
  _download_country_pbf netherlands "$NL_PBF"
  _download_country_pbf luxembourg  "$LU_PBF"

  if ! command -v osmium &>/dev/null; then
    echo "ERROR: osmium-tool is required to merge the Benelux PBF. Install with:"
    echo "  Fedora:        sudo dnf install osmium-tool"
    echo "  Debian/Ubuntu: sudo apt  install osmium-tool"
    echo "  macOS:         brew install osmium-tool"
    exit 1
  fi

  echo "Merging Benelux PBF (BE + NL + LU)…"
  osmium merge "$BE_PBF" "$NL_PBF" "$LU_PBF" -f pbf -o "$OSM_FILE.tmp"
  mv "$OSM_FILE.tmp" "$OSM_FILE"

  # Switching the source PBF invalidates the existing graph cache.
  rm -rf "$CACHE_DIR"
  echo "Benelux PBF ready — graph cache wiped, will rebuild on next start."
}

case "$CMD" in
  stop)    _stop; exit 0 ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Running (PID $(cat "$PID_FILE"))"
      curl -sf http://localhost:8989/health && echo "" || echo "(not yet ready)"
    else
      echo "Not running."
    fi
    exit 0
    ;;
  logs)    tail -f "$LOG_FILE"; exit 0 ;;
  rebuild) rm -rf "$CACHE_DIR"; echo "Cache wiped — restarting…" ;;
esac

# ── start ─────────────────────────────────────────────────────────────────────

if ! command -v java &>/dev/null; then
  echo "ERROR: java not found. Install JDK 21+." && exit 1
fi

if [ ! -f "$JAR" ]; then
  echo "Downloading GraphHopper ${GH_VERSION}…"
  curl -L --progress-bar \
    -o "$JAR.tmp" \
    "https://github.com/graphhopper/graphhopper/releases/download/${GH_VERSION}/graphhopper-web-${GH_VERSION}.jar"
  mv "$JAR.tmp" "$JAR"
fi

_build_benelux_pbf

_stop 2>/dev/null || true

echo "Starting GraphHopper…"
cd "$DIR"
nohup java \
  -Xmx6g -Xms1g \
  -Dfile.encoding=UTF-8 \
  -jar "$JAR" \
  server config.yml \
  > "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
echo "Started (PID $!). Logs: $LOG_FILE"
echo "First Benelux build takes ~25 min and needs ≥6 GB free RAM."
echo "Ready when: curl http://localhost:8989/health"
