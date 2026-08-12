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
docker run -d --name "$upstream" --network "$network" -e PORT=80 -v "$root/scripts/fault-server.py:/fault-server.py:ro" python:3.13-alpine python /fault-server.py >/dev/null
runtime_caddyfile="$(mktemp)"
trap 'rm -f "$runtime_caddyfile"; cleanup' EXIT
sed 's/goatcounter\.analytics\.svc\.cluster\.local/upstream:80/' "$root/Caddyfile" > "$runtime_caddyfile"
docker run -d --name "$site" --network "$network" -p 127.0.0.1::8080 -v "$runtime_caddyfile:/etc/caddy/Caddyfile:ro" "$run_id" >/dev/null
port=''
for _ in {1..30}; do
  port="$(docker port "$site" 8080/tcp 2>/dev/null | sed -E 's/.*:([0-9]+)$/\1/' || true)"
  [[ -n "$port" ]] && break
  sleep 1
done
[[ -n "$port" ]] || { echo 'site container did not publish port' >&2; exit 1; }

for _ in {1..20}; do
  curl -fsS "http://127.0.0.1:$port/health" >/dev/null && break
  sleep 1
done
curl -fsS "http://127.0.0.1:$port/health" | grep -Fxq ok
curl -fsS "http://127.0.0.1:$port/" | grep -Eiq '<!doctype html'
# The fixture deliberately returns 503 for analytics. This is a dependency
# failure, not a portfolio journey failure.
count_status="$(curl -sS --max-time 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/count")"
[[ "$count_status" == 503 ]] || { echo "/count returned HTTP $count_status (expected fixture 503)" >&2; exit 1; }
curl -fsS "http://127.0.0.1:$port/health" | grep -Fxq ok
curl -fsS "http://127.0.0.1:$port/" | grep -Eiq '<!doctype html'
printf 'dependency degradation check passed: analytics failure did not break portfolio availability\n'
