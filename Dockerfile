FROM docker.io/library/caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648

ARG BUILD_SHA=dev
ARG BUILD_RUN_ID=local

LABEL org.opencontainers.image.title="Francesco Belacca site" \
      org.opencontainers.image.description="Static personal site served by Caddy" \
      org.opencontainers.image.licenses="MIT"

COPY index.html reliability.html reliability.js reliability-evidence.js reliability-evidence.json reliability-evidence.schema.json status.html privacy.html status.json status.schema.json status-contract.md portfolio-slo.json portfolio-slo.schema.json styles.css app.js status.js count.js favicon.svg favicon.ico icon-16.png icon-32.png apple-touch-icon.png icon-192.png icon-512.png site.webmanifest robots.txt llms.txt sitemap.xml /srv/
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

# The upstream image grants cap_net_bind_service to Caddy. This workload
# listens on 8080 and runs with allowPrivilegeEscalation=false, so retaining
# that file capability makes hardened Kubernetes runtimes reject execve.
RUN setcap -r /usr/bin/caddy

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/usr/bin/caddy", "validate", "--config", "/etc/caddy/Caddyfile"]

USER 1000:1000
ENTRYPOINT ["/usr/bin/caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
