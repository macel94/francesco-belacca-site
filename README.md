# francesco.belacca.com

Personal public site for Francesco Belacca: Senior Site Reliability Engineer,
cloud engineer, and builder of reliable systems. The site also publishes a
truthful, bounded [reliability and systems note](reliability.html) describing
the current platform and its known gaps, plus a sanitized [public status page](status.html).

The site is intentionally a small static application. It includes a public reliability note and a status contract that displays fresh, sanitized hourly observations from a GitHub-hosted runner outside the native cluster, with an unknown-by-default fallback. Content is curated from
the public [`macel94/MACEL94`](https://github.com/macel94/MACEL94) profile source,
while the browser has no dependency on LinkedIn or a CMS at runtime. The
status page intentionally reads one public, sanitized artifact from GitHub.

## Platform production state

The platform now runs on the three-server native k3s production cluster.
Cloudflare DNS-only records for application hosts contain `.73`, `.41`, and
`.42`, and
native Flux, Traefik, cert-manager, Longhorn, Pong, portfolio, analytics, Dex,
Headlamp, and Flux Web are operational. Pong, GoatCounter, and Dex state was
quiesced, integrity-checked, and restored into native Longhorn-backed RWO PVCs.

Native production is not a development sandbox; use local mode or an explicitly
disposable isolated environment for development. See
[`belacca-infrastructure`](https://github.com/macel94/belacca-infrastructure),
[`belacca-gitops`](https://github.com/macel94/belacca-gitops), and the parent
[`belacca-platform`](https://github.com/macel94/belacca-platform) workspace.

## Local development

```bash
npm test
python3 -m http.server 8080
# open http://localhost:8080
```

The production image uses Caddy on port `8080` and exposes `GET /health` for
Kubernetes probes. The portfolio is stateless; Caddy also preserves the
same-origin `/count` proxy and its security/cache contract. `reliability.html` is static documentation, not a live status
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
- Reliability page with current native-production architecture, GitOps delivery,
  external 99%/30d SLO evidence boundaries, private diagnostics, incident
  practice, backup limitations, and recovery/failover gaps. Planned controls are
  labeled as planned; no secrets or sensitive host details are published.
- No third-party fonts, runtime analytics vendors, or client-side framework. The status page has one explicit read-only dependency on the raw GitHub status artifact.
- Self-hosted, cookie-free visitor analytics are served through the same-origin `/count` endpoint; see [`privacy.html`](privacy.html). The private dashboard is at `https://stats.belacca.com`.

## Delivery

`.github/workflows/test-and-publish.yml` runs the Node test suite, builds the
container, publishes an immutable SHA-tagged image to GHCR, scans the pushed
image digest, signs provenance/SBOM/vulnerability decision attestations, and
records both the human-readable SHA tag and exact `sha256` digest in
`deploy/kustomization.yaml`. The image build substitutes the source commit and
its short form into the site as build metadata; this identifies the artifact but
is not an availability measurement. Flux in the hosting cluster watches this
repository and reconciles that immutable deployment manifest. The `latest`
registry tag is only a convenience alias; native production never deploys it.

The policy and evidence pipeline exists and is live. The durable portfolio SLO contract is [`portfolio-slo.json`](portfolio-slo.json), with the operator procedure in [`docs/portfolio-reliability-checks.md`](docs/portfolio-reliability-checks.md): one external probe is one total event, and it is good only when both `/health` and `/` return their expected successful responses. The 99% target is an internal objective, not an SLA. The probe also supports out-of-band alias and path-preserving redirect assertions.

The external monitoring path is live. `belacca-status` publishes sanitized `status.json` observations and durable `slo.json` evidence from its external failure domain. Current service levels are calculated from the good and bad observations already available: good observations divided by good plus bad observations; observed counts and coverage are published alongside each number. Once the history spans 30 days, the denominator becomes the latest rolling 30-day window. External user-journey checks now cover the portfolio, Pong, and analytics collector; analytics uses `/status` plus same-origin `/count`, and representative portfolio aliases are also checked. Optional authenticated dashboard and Flux checks remain unconfigured and fail closed as configuration-unknown until an operator-managed identity is provisioned. Missing or malformed slots remain visible as coverage context and never count as success.

The portfolio synthetic checks health, homepage HTML/canonical metadata, cache freshness, and (when configured out of band) aliases plus path/query preservation. GoatCounter is deliberately outside the primary portfolio availability SLI: `scripts/runtime-check.sh` runs a disposable site with a failing analytics upstream and proves that `/health` and `/` still work. Native Prometheus is private diagnostic telemetry, not external availability proof or a public SLO calculation. No paging destination is provisioned; no off-cluster backup, health-aware failover, or real failure drills are claimed. A separate controlled-drill recovery P95 under six minutes remains unproven. `scripts/gitops-rollback-check.sh` proves reviewed Git revert recovery of the Kustomize desired image tag in an isolated repository; a production Flux reconciliation drill and external observation are operator follow-up, not claimed evidence. The reliability page describes these boundaries rather than implying that they exist.
Image delivery now has registry SBOM, provenance, and signed
`native-production-v1` vulnerability-decision attestations for the exact image
digest. Verify an immutable GHCR image with `scripts/verify-attestation.sh`;
Kyverno admission requires the digest plus all matching attestations before a
new production Pod can start.

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

The scheduled `.github/workflows/synthetic-check.yml` runs the portfolio SLI
probe for `/health` and `/`, and can assert aliases/path-preserving redirects
when `SYNTHETIC_ALIAS_URLS` is configured as an out-of-band variable. The
workflow safely skips when no canonical URL is configured. The separate [`macel94/belacca-status`](https://github.com/macel94/belacca-status)
workflow is the hourly external publisher. It runs outside the VM, checks the
portfolio, Pong, analytics `/status` and `/count`, and representative portfolio
aliases, then commits sanitized observations and regenerates both `status.json`
and `slo.json`. Status artifacts expire when freshness requirements fail; SLO artifacts retain measured levels and expose coverage and schema state. Authenticated dashboard checks remain unconfigured, and Flux checks remain configuration-unknown until their dedicated least-privilege identity is managed out of band.

Local dry runs require no credentials or external endpoint:

```bash
./scripts/supply-chain.sh sbom --dry-run
./scripts/supply-chain.sh scan --dry-run
./scripts/verify-attestation.sh ghcr.io/macel94/francesco-belacca-site@sha256:$(printf '0%.0s' {1..64}) --dry-run
./scripts/synthetic-check.sh --dry-run
./scripts/runtime-check.sh --dry-run
./scripts/gitops-rollback-check.sh --dry-run
```

### Evidence and AI-assistance boundary

The public status page consumes the sanitized v2 `status.json` artifact from the separate
status repository and falls back to checked-in `unknown` / `not_configured` when
that artifact is missing, malformed, or stale. The separate `slo.json` artifact
is durable reliability evidence for the 99%/30d internal objective; it is rendered
by the reliability page as measured evidence, not as current status or an SLA. The GitHub-hosted runner is an external observation source, not
multi-region monitoring. Human approval applies
to the monitoring policy, not to each automated observation. The page cannot be
served during a complete outage of the native cluster; the remote repository retains
the observation for display after recovery. Any AI-assisted summary of
operational evidence must be read-only, evidence-linked, and subject to human approval. Production changes are GitOps-only: they must be proposed, reviewed,
tested, and applied through the appropriate repository and Flux path. This site
repository does not collect Kubernetes evidence, request Secrets, or mutate a cluster.

The canonical public URL is [`https://francesco.belacca.com`](https://francesco.belacca.com).
The aliases `belacca.com`, `www.belacca.com`, and
`www.francesco.belacca.com` permanently redirect to that URL. The complete
platform inventory is maintained in
[`macel94/belacca-gitops/docs/SITES.md`](https://github.com/macel94/belacca-gitops/blob/main/docs/SITES.md).
deployment and shared host routing live in
[`macel94/belacca-gitops`](https://github.com/macel94/belacca-gitops).
