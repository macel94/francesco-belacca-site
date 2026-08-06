# francesco.belacca.com

Personal public site for Francesco Belacca: Senior Site Reliability Engineer,
cloud engineer, and builder of reliable systems. The site also publishes a
truthful, bounded [reliability and systems note](reliability.html) describing
the current platform and its known gaps, plus a sanitized [public status page](status.html).

The site is intentionally a small static application. It includes a public reliability note and an unknown-by-default status contract; neither page claims live availability until externally published evidence exists. Content is curated from
the public [`macel94/MACEL94`](https://github.com/macel94/MACEL94) profile source,
while the browser has no dependency on LinkedIn, GitHub APIs, or a CMS at
runtime.

## Local development

```bash
npm test
python3 -m http.server 8080
# open http://localhost:8080
```

The production image uses NGINX on port `8080` and exposes `GET /health` for
Kubernetes probes. `reliability.html` is static documentation, not a live status
feed or telemetry endpoint:

```bash
docker build -t francesco-belacca-site:local .
docker run --rm -p 8080:8080 francesco-belacca-site:local
curl -fsS http://localhost:8080/health
# open http://localhost:8080/reliability.html
# open http://localhost:8080/status.html
```

## Design language

- Dark, high-contrast systems-console foundation.
- Acid green and cyan accents used as signal, not decoration everywhere.
- CSS grid, terminal panels, telemetry cues, and restrained motion for a
  professional but slightly hacker/matrix character.
- Responsive layout and a complete `prefers-reduced-motion` path.
- Reliability page with current architecture, GitOps delivery, security boundaries,
  SLO methodology, backup limitations, and incident/recovery practice. Planned
  controls are labeled as planned; no secrets or sensitive host details are
  published.
- No third-party fonts, runtime analytics vendors, runtime APIs, or client-side framework.
- Self-hosted, cookie-free visitor analytics are served through the same-origin `/count` endpoint; see [`privacy.html`](privacy.html). The private dashboard is at `https://stats.belacca.com`.

## Delivery

`.github/workflows/test-and-publish.yml` runs the Node test suite, builds the
container, publishes immutable SHA-tagged images to GHCR, and records the
published tag in `deploy/kustomization.yaml`. The image build substitutes the
source commit and its short form into the site as build metadata; this identifies
the artifact but is not an availability measurement. Flux in the hosting cluster
watches this repository and reconciles that deployment manifest.

The current site does not provide application SLO telemetry, burn-rate alerts,
an externally generated status feed, scheduled off-cluster backups, verified
restore automation, or a formal incident paging integration. The reliability page describes
these as gaps or planned work rather than implying they exist. `status.json` is
checked in as `unknown` / `not_configured`; it is not an uptime feed until an
external publisher supplies a reviewed, timestamped, source-linked artifact.
Image delivery now has a registry SBOM and GitHub Artifact Attestation
provenance. Verify an immutable GHCR image with
`scripts/verify-attestation.sh`; live admission or Flux enforcement is still not
configured.

### Supply chain and synthetic endpoint check

`.github/workflows/supply-chain.yml` builds the site image in CI, uploads a
CycloneDX SBOM, and stores a Trivy HIGH/CRITICAL report. Normal runs are
report-only and ignore unfixed findings; use the workflow's manual `strict=true`
input for an explicit security gate. The regular publish workflow adds a registry SBOM and GitHub Artifact
Attestation provenance to the pushed GHCR image. `actions/attest@v4` signs the
SLSA provenance with GitHub's short-lived identity and pushes it to the
registry; these attestations exist on a pushed image, not on a local `docker
build`.

Verify an immutable image with:

```bash
./scripts/verify-attestation.sh \
  ghcr.io/macel94/francesco-belacca-site@sha256:<digest>
```

The helper runs `gh attestation verify` with the expected repository, publish
workflow, OIDC issuer, GitHub attestation record, and SLSA provenance predicate. No
separate signing executable, private key, or manual signing workflow is required. The
image digest identifies exact bytes; the GitHub attestation provides signed
build provenance. Automatic admission or Flux verification remains a separate
future control.

The scheduled `.github/workflows/synthetic-check.yml` checks `/health` and the
HTML shell. Configure `SYNTHETIC_SITE_URL` as an out-of-band repository or
organization variable. Without it, the script explicitly skips rather than
claiming a public monitor or alerting integration exists. The Pong two-player
journey is owned by the sibling `cloudnativepong` repository.

Local dry runs require no credentials or external endpoint:

```bash
./scripts/supply-chain.sh sbom --dry-run
./scripts/supply-chain.sh scan --dry-run
./scripts/verify-attestation.sh ghcr.io/macel94/francesco-belacca-site@sha256:$(printf '0%.0s' {1..64}) --dry-run
./scripts/synthetic-check.sh --dry-run
```

### Evidence and AI-assistance boundary

The public status page consumes only the sanitized `status.json` contract. It
is not a cluster-to-browser status API, and the checked-in default remains
`unknown` / `not_configured` until an external publisher supplies reviewed,
timestamped evidence. Any AI-assisted summary of operational evidence must be
read-only, evidence-linked, and subject to human approval. Production changes
are GitOps-only: they must be proposed, reviewed, tested, and applied through
the appropriate repository and Flux path. This site repository does not collect
Kubernetes evidence, request Secrets, or mutate a cluster.

The canonical public URL is [`https://francesco.belacca.com`](https://francesco.belacca.com).
The deployment and shared host routing live in
[`macel94/belacca-gitops`](https://github.com/macel94/belacca-gitops).
