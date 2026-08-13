# Portfolio reliability checks

This runbook is the operational companion to [`portfolio-slo.json`](../portfolio-slo.json).
It separates deterministic repository evidence from production evidence that requires
an external endpoint, GitHub Actions variables, cluster access, and human review.

## SLI and objective

- **Service:** `portfolio`
- **Objective:** 99% over a rolling 30-day window; internal objective, not an SLA.
- **Total event:** one external probe invocation attempting both `GET /health` and
  `GET /`.
- **Good event:** `/health` returns HTTP 200, body `ok`, and `Cache-Control: no-store`,
  and `/` returns HTTP 200, a valid HTML shell containing the canonical URL, and a
  revalidation cache directive.
- **Calculation:** `good_events / total_events`.
- **Analytics boundary:** `/count` is a same-origin diagnostic dependency. Its
  failure is not a primary SLI failure when the health and homepage journey remains
  available.
- **Evidence state in this repository:** `measured` over `available_history` now;
  the separate publisher switches the measurement window to `rolling_30d` after
  the evidence spans 30 days.

A build SHA, build link, image digest, Kubernetes readiness result, or Flux health
result identifies delivery state but is never availability evidence.

## Local deterministic checks

These checks do not require credentials or a production endpoint:

```bash
node scripts/validate-slo.mjs
./scripts/synthetic-check.sh --dry-run
./scripts/gitops-rollback-check.sh
./scripts/runtime-check.sh --dry-run
```

`gitops-rollback-check.sh` creates a temporary Git repository, commits a deliberately
bad immutable image tag, performs a real `git revert`, and verifies that the known-good
`deploy/kustomization.yaml` tag is restored. `runtime-check.sh` requires Docker to
build the site and run a disposable failing analytics upstream; it must be run in CI
or an operator environment with Docker. It never contacts production.

## External synthetic configuration

Configure these as repository or organization variables, not committed files:

- `SYNTHETIC_SITE_URL`: canonical `https://francesco.belacca.com` endpoint.
- `SYNTHETIC_ALIAS_URLS`: comma-separated alias origins, for example
  `https://belacca.com,https://www.belacca.com,https://www.francesco.belacca.com`.
- `SYNTHETIC_REDIRECT_PATHS`: comma-separated paths such as
  `/reliability.html?journey=1,/status.html?journey=1`.

The scheduled workflow safely skips if `SYNTHETIC_SITE_URL` is unset. With aliases
configured, it requires HTTP 301 or 308 and verifies that every path and query string
is preserved at the canonical host. The primary SLI remains the canonical health and
homepage journey; aliases are redirect assertions, not separate services.

## Production Flux rollback follow-up

This is an operator procedure and was **not performed by the isolated coding
worktree**. Do not use a direct `kubectl set image` or an ad hoc cluster shell.

1. In an approved maintenance or incident window, capture a fresh external synthetic
   run URL and the current `deploy/kustomization.yaml` immutable image tag.
2. Identify the last reviewed known-good release commit and the suspected bad release
   commit. Confirm the image tag is an exact `sha-<40 hex>` tag.
3. Open or review a Git change that reverts the bad desired-state commit (or restores
   the known-good tag). Run `npm test`, `node scripts/validate-slo.mjs`, and
   `./scripts/gitops-rollback-check.sh` before approval.
4. Merge the reviewed change through the normal repository branch protection path.
   Flux must be the actor that reconciles the changed desired state.
5. Record the Flux reconciliation result from the platform's approved read-only
   observation path, then run the external synthetic journey again. Recovery evidence
   requires `/health` and `/` to pass; the build identifier alone is insufficient.
6. Preserve the before/after Git commit SHAs, desired image tags, Flux reconciliation
   timestamp/result, synthetic run URL, and any incident reference. Do not record
   secrets, response bodies, internal addresses, or raw exception messages.

If cluster access, Flux observation, or a configured external URL is unavailable, stop
and record the limitation. Never convert a local revert simulation into a claim that
production recovered.

## Known validation limitation for this change

The clean worktree has no Docker daemon, configured production URL, credentials, or
cluster access. Therefore this change validates the contract, shell behavior, and
isolated Git revert locally; it does not claim a live GoatCounter fault drill, alias
redirect observation, or production Flux reconciliation. Those exact operator actions
above remain required before reporting measured production evidence.
