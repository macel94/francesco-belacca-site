#!/usr/bin/env bash
# Local SBOM/vulnerability helpers for the static site image.
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
usage:
  scripts/supply-chain.sh sbom [IMAGE] [--output DIR] [--dry-run]
  scripts/supply-chain.sh scan [IMAGE] [--output DIR] [--strict] [--dry-run]
  scripts/supply-chain.sh digest IMAGE [--dry-run]

The default scan reports HIGH/CRITICAL findings but exits successfully. Use
--strict (or SUPPLY_CHAIN_STRICT=1) in a reviewed security/release run.
EOF
  exit 2
}

command_name="${1:-}"
shift || true
image="francesco-belacca-site:local"
output_dir="artifacts/supply-chain"
dry_run=0
strict="${SUPPLY_CHAIN_STRICT:-0}"

while (($#)); do
  case "$1" in
    --output) output_dir="${2:?missing value for --output}"; shift 2 ;;
    --strict) strict=1; shift ;;
    --dry-run) dry_run=1; shift ;;
    --help|-h) usage ;;
    --*) echo "unknown option: $1" >&2; usage ;;
    *) image="$1"; shift ;;
  esac
done

run_or_print() {
  if ((dry_run)); then
    printf '+ '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

if [[ "$command_name" == digest ]]; then
  if ((dry_run)); then echo "would inspect immutable digest for: $image"; exit 0; fi
  command -v podman >/dev/null 2>&1 || { echo 'podman is required (or use --dry-run)' >&2; exit 127; }
  podman image inspect --format '{{.Id}}' "$image"
  if command -v skopeo >/dev/null 2>&1; then skopeo inspect --format '{{.Digest}}' "docker://$image"; fi
  exit 0
fi

if ((dry_run)); then
  mkdir_cmd=:
else
  command -v "$([[ "$command_name" == sbom ]] && echo syft || echo trivy)" >/dev/null 2>&1 || {
    echo 'syft or trivy is required (or use --dry-run)' >&2
    exit 127
  }
  mkdir_cmd='mkdir -p'
fi
run_or_print $mkdir_cmd "$output_dir"

case "$command_name" in
  sbom)
    run_or_print syft "docker:$image" --output "spdx-json=$output_dir/site.sbom.spdx.json"
    ;;
  scan)
    exit_code=0
    [[ "$strict" == 1 ]] && exit_code=1
    run_or_print trivy image --severity "${TRIVY_SEVERITY:-HIGH,CRITICAL}" \
      --ignore-unfixed="${TRIVY_IGNORE_UNFIXED:-true}" --format json \
      --output "$output_dir/site.trivy.json" --exit-code "$exit_code" "$image"
    ;;
  *) usage ;;
esac
