# Rebuild the same standard Caddy release with the fixed Go/HTTP2 stack.
FROM docker.io/library/golang:1.27.2-alpine@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS caddy-build
ENV GOTOOLCHAIN=local
WORKDIR /src
COPY build/caddy/go.mod build/caddy/go.sum ./
RUN go mod download
COPY build/caddy/main.go ./
RUN CGO_ENABLED=0 go list -deps . > /tmp/caddy-deps.txt \
    && ! grep -Eq '^golang.org/x/crypto/openpgp(/|$)' /tmp/caddy-deps.txt
RUN CGO_ENABLED=0 go build -p=1 -trimpath -ldflags="-s -w" -o /out/caddy .

FROM docker.io/library/caddy:2.11.7-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f

ARG BUILD_SHA=dev
ARG BUILD_RUN_ID=local

LABEL org.opencontainers.image.title="Francesco Belacca site" \
      org.opencontainers.image.description="Static personal site served by Caddy" \
      org.opencontainers.image.licenses="MIT"

COPY index.html reliability.html reliability.js reliability-evidence.js reliability-evidence.json reliability-evidence.schema.json status.html privacy.html status.json status.schema.json status-contract.md portfolio-slo.json portfolio-slo.schema.json styles.css app.js status.js count.js favicon.svg favicon-tab.png favicon.ico icon-16.png icon-32.png apple-touch-icon.png icon-192.png icon-512.png site.webmanifest robots.txt llms.txt sitemap.xml /srv/
COPY Caddyfile /etc/caddy/Caddyfile
RUN build_sha_short="$(printf '%s' "${BUILD_SHA}" | cut -c1-7)" \
    && build_run_url="https://github.com/macel94/francesco-belacca-site/actions" \
    && if [ "${BUILD_RUN_ID}" != "local" ]; then build_run_url="https://github.com/macel94/francesco-belacca-site/actions/runs/${BUILD_RUN_ID}"; fi \
    && sed -i \
      -e "s#__BUILD_SHA__#${BUILD_SHA}#g" \
      -e "s#__BUILD_SHA_SHORT__#${build_sha_short}#g" \
      -e "s#__BUILD_RUN_URL__#${build_run_url}#g" \
      /srv/index.html \
      /srv/reliability.html \
      /srv/status.html

# Refresh OS and CA security fixes before publishing the immutable image.
RUN apk upgrade --no-cache

# The upstream image grants cap_net_bind_service to Caddy. This workload
# listens on 8080 and runs with allowPrivilegeEscalation=false, so retaining
# that file capability makes hardened Kubernetes runtimes reject execve.
RUN setcap -r /usr/bin/caddy
COPY --from=caddy-build /out/caddy /usr/bin/caddy
RUN capabilities="$(getcap /usr/bin/caddy)" && test -z "$capabilities"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/usr/bin/caddy", "validate", "--config", "/etc/caddy/Caddyfile"]

USER 1000:1000
ENTRYPOINT ["/usr/bin/caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
