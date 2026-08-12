#!/usr/bin/env bash
# External portfolio SLI probe. One invocation is one total event: /health and
# / must both pass. Alias and redirect assertions are journey checks, not
# separate availability services. Production URLs are supplied out of band.
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
usage: scripts/synthetic-check.sh [--dry-run]

Required in a configured run:
  SYNTHETIC_SITE_URL       canonical HTTPS URL
Optional:
  SYNTHETIC_ALIAS_URLS     comma-separated alias URLs
  SYNTHETIC_REDIRECT_PATHS comma-separated paths (default: /reliability.html?journey=1)
  SYNTHETIC_TIMEOUT_SECONDS (default: 15)
  REQUIRE_SYNTHETIC=1      fail instead of safely skipping an unset URL
EOF
  exit 2
}

[[ "${1:-}" != --* || "${1:-}" == --dry-run ]] || usage

base="${SYNTHETIC_SITE_URL:-}"
paths="${SYNTHETIC_REDIRECT_PATHS:-/reliability.html?journey=1}"
timeout="${SYNTHETIC_TIMEOUT_SECONDS:-15}"

if [[ "${1:-}" == "--dry-run" ]]; then
  base="${base:-https://example.invalid}"
  echo "would GET $base/health (HTTP 200, body ok, Cache-Control no-store)"
  echo "would GET $base/ (HTTP 200, HTML shell, canonical URL, revalidation cache)"
  echo "would assert aliases: ${SYNTHETIC_ALIAS_URLS:-<unset>}"
  echo "would preserve redirect paths: $paths"
  exit 0
fi

if [[ -z "$base" ]]; then
  if [[ "${REQUIRE_SYNTHETIC:-0}" == 1 ]]; then
    echo 'SYNTHETIC_SITE_URL is required when REQUIRE_SYNTHETIC=1' >&2
    exit 2
  fi
  echo 'SYNTHETIC_SITE_URL is unset; external SLI check is intentionally skipped.'
  echo 'Configure it as an out-of-band repository/org variable or local environment value.'
  exit 0
fi

base="${base%/}"
case "$base" in
  https://*) ;;
  *) echo "SYNTHETIC_SITE_URL must use https://" >&2; exit 2 ;;
esac

curl_args=(--silent --show-error --fail --max-time "$timeout")
check_headers() {
  local url="$1" expected_status="$2" expected_cache="$3" output="$4"
  local headers status cache
  headers="$(mktemp)"
  trap 'rm -f "$headers"' RETURN
  status="$(curl "${curl_args[@]}" --dump-header "$headers" --output "$output" --write-out '%{http_code}' "$url")"
  [[ "$status" == "$expected_status" ]] || { echo "$url returned HTTP $status (expected $expected_status)" >&2; return 1; }
  cache="$(awk 'BEGIN{IGNORECASE=1} /^Cache-Control:/{sub("\r$", ""); sub("^[^:]*:[[:space:]]*", ""); print}' "$headers" | tail -1)"
  [[ "$cache" == *"$expected_cache"* ]] || { echo "$url has Cache-Control '$cache' (expected '$expected_cache')" >&2; return 1; }
}

health_body="$(mktemp)"
home_body="$(mktemp)"
trap 'rm -f "$health_body" "$home_body"' EXIT
check_headers "$base/health" 200 no-store "$health_body"
grep -Fxq ok "$health_body"
check_headers "$base/" 200 'no-cache, must-revalidate' "$home_body"
grep -Eiq '<!doctype html' "$home_body"
grep -Fq '<link rel="canonical" href="https://francesco.belacca.com/"' "$home_body"

IFS=',' read -r -a aliases <<< "${SYNTHETIC_ALIAS_URLS:-}"
for alias in "${aliases[@]}"; do
  [[ -z "$alias" ]] && continue
  alias="${alias%/}"
  redirect_status="$(curl --silent --show-error --max-time "$timeout" --output /dev/null --write-out '%{http_code}' "$alias/health")"
  [[ "$redirect_status" == 301 || "$redirect_status" == 308 ]] || { echo "$alias/health returned HTTP $redirect_status (expected 301 or 308)" >&2; exit 1; }
  location="$(curl --silent --show-error --max-time "$timeout" --output /dev/null --write-out '%{redirect_url}' "$alias/health")"
  [[ "$location" == "$base/health" ]] || { echo "$alias/health did not redirect to $base/health (got '$location')" >&2; exit 1; }
done

IFS=',' read -r -a redirect_paths <<< "$paths"
if ((${#aliases[@]} > 0)); then
  for alias in "${aliases[@]}"; do
    [[ -z "$alias" ]] && continue
    alias="${alias%/}"
    for path in "${redirect_paths[@]}"; do
      [[ "$path" == /* ]] || { echo "redirect path must start with /: $path" >&2; exit 2; }
      redirect_status="$(curl --silent --show-error --max-time "$timeout" --output /dev/null --write-out '%{http_code}' "$alias$path")"
      [[ "$redirect_status" == 301 || "$redirect_status" == 308 ]] || { echo "$alias$path returned HTTP $redirect_status (expected 301 or 308)" >&2; exit 1; }
      location="$(curl --silent --show-error --max-time "$timeout" --output /dev/null --write-out '%{redirect_url}' "$alias$path")"
      expected="$base$path"
      [[ "$location" == "$expected" ]] || { echo "$alias$path did not redirect to the canonical path/query (got '$location', expected '$expected')" >&2; exit 1; }
    done
  done
else
  echo 'no SYNTHETIC_ALIAS_URLS configured; alias and redirect assertions are skipped.'
fi

printf 'portfolio SLI probe passed: %s (health + homepage; aliases/redirects asserted when configured)\n' "$base"
