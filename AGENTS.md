# Agent instructions: francesco-belacca-site

This repository owns the static portfolio source, assets, Caddy configuration, tests, and `deploy/` application manifests. Read [`belacca-platform/docs/gitops-delivery.md`](https://github.com/macel94/belacca-platform/blob/main/docs/gitops-delivery.md) before changing production-facing files.

## Safe delivery path

1. Run local site tests (`npm test`) and focused/browser checks as appropriate.
2. Commit and push the source change to `main`.
3. Wait for `.github/workflows/test-and-publish.yml` to pass, publish the immutable GHCR image and attestations, and append its generated `deploy: publish site ...` commit.
4. Fetch that generated commit. It updates `deploy/kustomization.yaml` with the immutable `sha-<source-commit>` image tag and digest.
5. Reconcile Flux source `francesco-belacca-site` and Kustomization `portfolio`, then verify the `portfolio/francesco-site` image/digest, rollout, `/health`, visible build marker, assets, and public synthetic checks.

Do not manually `kubectl apply`, `set image`, or use the mutable `latest` tag as production deployment. Do not edit the workflow-generated image pin from `belacca-gitops` for normal releases. Update the parent submodule pointer only after the generated deployment commit is on `origin/main` and only when the workspace should track it. Flux `Signature: none` is expected while this unsigned child GitRepository has no `spec.verify` configuration.
