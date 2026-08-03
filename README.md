# francesco.belacca.com

Personal public site for Francesco Belacca: Senior Site Reliability Engineer,
cloud engineer, and builder of reliable systems.

The site is intentionally a small static application. Content is curated from
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
Kubernetes probes:

```bash
docker build -t francesco-belacca-site:local .
docker run --rm -p 8080:8080 francesco-belacca-site:local
curl -fsS http://localhost:8080/health
```

## Design language

- Dark, high-contrast systems-console foundation.
- Acid green and cyan accents used as signal, not decoration everywhere.
- CSS grid, terminal panels, telemetry cues, and restrained motion for a
  professional but slightly hacker/matrix character.
- Responsive layout and a complete `prefers-reduced-motion` path.
- No third-party fonts, trackers, runtime APIs, or client-side framework.

## Delivery

`.github/workflows/test-and-publish.yml` runs the Node test suite, builds the
container, publishes immutable SHA-tagged images to GHCR, and records the
published tag in `deploy/kustomization.yaml`. Flux in the hosting cluster
watches this repository and reconciles that deployment manifest.

The canonical public URL is [`https://francesco.belacca.com`](https://francesco.belacca.com).
The deployment and shared host routing live in
[`macel94/belacca-gitops`](https://github.com/macel94/belacca-gitops).
