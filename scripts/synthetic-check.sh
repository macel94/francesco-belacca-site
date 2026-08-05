#!/usr/bin/env bash
# Endpoint-only synthetic for the static site. The Pong journey lives in the
# cloudnativepong repository's synthetic-check.mjs.
set -euo pipefail

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "would GET ${SYNTHETIC_SITE_URL:-https://example.invalid}/health"
  echo "would GET ${SYNTHETIC_SITE_URL:-https://example.invalid}/"
  exit 0
fi

if [[ -z "${SYNTHETIC_SITE_URL:-}" ]]; then
  if [[ "${REQUIRE_SYNTHETIC:-0}" == 1 ]]; then
    echo 'SYNTHETIC_SITE_URL is required when REQUIRE_SYNTHETIC=1' >&2
    exit 2
  fi
  echo 'SYNTHETIC_SITE_URL is unset; site check is intentionally skipped.'
  echo 'Configure it as an out-of-band repository/org variable or local environment value.'
  exit 0
fi

base="${SYNTHETIC_SITE_URL%/}"
curl --fail --silent --show-error --max-time "${SYNTHETIC_TIMEOUT_SECONDS:-15}" "$base/health" >/dev/null
curl --fail --silent --show-error --max-time "${SYNTHETIC_TIMEOUT_SECONDS:-15}" "$base/" | grep -q '<!doctype html\|<!DOCTYPE html'
printf 'site synthetic passed: %s\n' "$base"
