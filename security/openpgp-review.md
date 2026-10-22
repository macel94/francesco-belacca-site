# Exact-version OpenPGP absence review

Reviewed for the October 2026 security rebuild. This rotates the existing
GO-2026-5932 assessment to **only** `pkg:golang/golang.org/x/crypto@v0.57.0`;
the old 0.52.0 scope is retired. No additional advisory, version range, severity
exemption, or known-unfixed bypass is authorized.

## Evidence

- Publisher source `cb929d79e4d4023ae530b61c0c3fc5a7f20488dd`:
  [scan run](https://github.com/macel94/francesco-belacca-site/actions/runs/39748398298).
  Its report contains exactly one finding: GO-2026-5932, x/crypto v0.57.0,
  UNKNOWN, no fixed version. The raw report remains evidence; the unmaintained
  OpenPGP package itself has not been fixed.
- With the final Go 1.27.3 builder, `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go list -deps .`
  in `build/caddy` produces 1,029 production imports, excludes
  `golang.org/x/crypto/openpgp` and every subpackage, and resolves x/crypto
  exactly to v0.57.0.
- The Docker build explicitly rejects that package before compiling the standard
  Caddy 2.11.7 modules. The omitted Go package cannot be dynamically imported.
- Caddy lock SHA-256: go.mod
  `ad7ba0627fc78e59b4ea80587833432e649810bad340a529407b84d2600747c0`;
  go.sum `6af3a164233778b8a67386362356bfb312d26888ccee645b7180f07fc27e8574`.

This meets OpenVEX `vulnerable_code_not_present`: component metadata remains,
but the vulnerable code is excluded from this binary. It is not a universal
safety statement about x/crypto v0.57.0. The publisher's signed decision binds
the assessment to the exact image digest. Changed versions need a new review;
introducing an OpenPGP import fails the build. Tests keep retired/future
versions, wrong package identities and other unfixed findings blocked.
HIGH/CRITICAL findings remain blocking even when a fixed version is available;
patch availability is not evidence that an installed package is fixed.

References: [Go advisory](https://pkg.go.dev/vuln/GO-2026-5932),
[OpenVEX justification definitions](https://github.com/openvex/spec/blob/main/OPENVEX-SPEC.md#status-justifications).
