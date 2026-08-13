#!/usr/bin/env bash
# Deterministic disposable-container check for dependency degradation.
# It intentionally requires Docker and never contacts production.
set -euo pipefail

if [[ "${1:-}" == --dry-run ]]; then
  echo 'would build a local site image'
  echo 'would run a disposable failing analytics upstream and site container'
  echo 'would assert /count may fail while /health and / remain healthy'
  exit 0
fi

command -v docker >/dev/null 2>&1 || { echo 'docker is required (or use --dry-run)' >&2; exit 127; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
run_id="portfolio-runtime-check-$$"
network="$run_id-net"
site="$run_id-site"
upstream="$run_id-upstream"
cleanup() {
  docker rm -f "$site" "$upstream" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build --quiet --build-arg BUILD_SHA=runtime-check --build-arg BUILD_RUN_ID=local -t "$run_id" "$root" >/dev/null
docker network create "$network" >/dev/null
docker run -d --name "$upstream" --network "$network" --network-alias upstream -e PORT=80 -v "$root/scripts/fault-server.py:/fault-server.py:ro" python:3.13-alpine python /fault-server.py >/dev/null
runtime_caddyfile="$(mktemp)"
trap 'rm -f "$runtime_caddyfile"; cleanup' EXIT
chmod 0644 "$runtime_caddyfile"
sed 's/goatcounter\.analytics\.svc\.cluster\.local/upstream:80/' "$root/Caddyfile" > "$runtime_caddyfile"
upstream_ready=0
for _ in {1..20}; do
  upstream_state="$(docker inspect --format '{{.State.Status}}' "$upstream" 2>/dev/null || true)"
  if [[ "$upstream_state" == running ]] && docker exec "$upstream" python -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:80/health", timeout=1)' >/dev/null 2>&1; then
    upstream_ready=1
    break
  fi
  [[ "$upstream_state" == exited || "$upstream_state" == dead ]] && {
    echo 'fault-server container exited before readiness' >&2
    docker logs "$upstream" >&2 || true
    exit 1
  }
  sleep 1
done
[[ "$upstream_ready" == 1 ]] || {
  echo 'fault-server did not answer its local health probe' >&2
  docker logs "$upstream" >&2 || true
  exit 1
}
docker run -d --name "$site" --network "$network" -p 127.0.0.1::8080 -v "$runtime_caddyfile:/etc/caddy/Caddyfile:ro" "$run_id" >/dev/null
port=''
for _ in {1..30}; do
  site_state="$(docker inspect --format '{{.State.Status}}' "$site" 2>/dev/null || true)"
  [[ "$site_state" == exited || "$site_state" == dead ]] && {
    echo 'site container exited before publishing its port' >&2
    docker logs "$site" >&2 || true
    exit 1
  }
  port="$(docker port "$site" 8080/tcp 2>/dev/null | sed -E 's/.*:([0-9]+)$/\1/' || true)"
  [[ -n "$port" ]] && break
  sleep 1
done
[[ -n "$port" ]] || {
  echo 'site container did not publish port' >&2
  docker logs "$site" >&2 || true
  exit 1
}

for _ in {1..20}; do
  site_state="$(docker inspect --format '{{.State.Status}}' "$site" 2>/dev/null || true)"
  [[ "$site_state" == running ]] || {
    echo "site container stopped while waiting for readiness (state: ${site_state:-missing})" >&2
    docker logs "$site" >&2 || true
    exit 1
  }
  curl -fsS "http://127.0.0.1:$port/health" >/dev/null && break
  sleep 1
done
curl -fsS "http://127.0.0.1:$port/health" | grep -Fxq ok
curl -fsS "http://127.0.0.1:$port/" | grep -Eiq '<!doctype html'
# The fixture deliberately returns 503 for analytics. This is a dependency
# failure, not a portfolio journey failure.
count_status="$(curl -sS --max-time 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/count")"
[[ "$count_status" == 503 ]] || {
  echo "/count returned HTTP $count_status (expected fixture 503)" >&2
  echo '--- fault-server logs ---' >&2
  docker logs "$upstream" >&2 || true
  echo '--- site logs ---' >&2
  docker logs "$site" >&2 || true
  exit 1
}
curl -fsS "http://127.0.0.1:$port/health" | grep -Fxq ok
curl -fsS "http://127.0.0.1:$port/" | grep -Eiq '<!doctype html'
printf 'dependency degradation check passed: analytics failure did not break portfolio availability\n'
