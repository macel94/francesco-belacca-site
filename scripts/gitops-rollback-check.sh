#!/usr/bin/env bash
# Prove the reviewed GitOps rollback shape without credentials or a cluster.
# A temporary repository models the desired-state commit and a real git revert.
# A production operator-run production drill is intentionally not attempted here.
set -euo pipefail

if [[ "${1:-}" == --dry-run ]]; then
  echo 'would create a disposable Git repository with deploy/kustomization.yaml'
  echo 'would commit a bad immutable image tag and revert that commit'
  echo 'would verify the known-good desired image tag is restored'
  echo 'production Flux reconciliation evidence requires an operator-run follow-up'
  exit 0
fi

command -v git >/dev/null 2>&1 || { echo 'git is required (or use --dry-run)' >&2; exit 127; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/deploy"
cp "$root/deploy/kustomization.yaml" "$tmp/deploy/kustomization.yaml"
known_good="$(sed -nE 's/^    newTag: (sha-[0-9a-f]{40})$/\1/p' "$tmp/deploy/kustomization.yaml")"
[[ "$known_good" =~ ^sha-[0-9a-f]{40}$ ]] || { echo 'could not identify known-good immutable image tag' >&2; exit 1; }

git -C "$tmp" init -q
git -C "$tmp" config user.name 'rollback-check'
git -C "$tmp" config user.email 'rollback-check@example.invalid'
git -C "$tmp" add deploy/kustomization.yaml
git -C "$tmp" commit -q -m 'known-good desired state'

bad="sha-$(printf 'b%.0s' {1..40})"
sed -i -E "s#^(    newTag: ).*#\1${bad}#" "$tmp/deploy/kustomization.yaml"
git -C "$tmp" add deploy/kustomization.yaml
git -C "$tmp" commit -q -m 'test: introduce reviewed rollback candidate'
bad_commit="$(git -C "$tmp" rev-parse HEAD)"

git -C "$tmp" revert --no-edit "$bad_commit" >/dev/null
restored="$(sed -nE 's/^    newTag: (sha-[0-9a-f]{40})$/\1/p' "$tmp/deploy/kustomization.yaml")"
[[ "$restored" == "$known_good" ]] || { echo "rollback restored '$restored', expected '$known_good'" >&2; exit 1; }
git -C "$tmp" diff --quiet || { echo 'rollback left uncommitted desired-state changes' >&2; exit 1; }
printf 'GitOps rollback check passed: %s -> %s via git revert\n' "$bad" "$restored"
