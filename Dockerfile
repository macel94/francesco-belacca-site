FROM docker.io/library/nginx:1.27-alpine

ARG BUILD_SHA=dev

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf security-headers.conf /etc/nginx/
COPY index.html reliability.html status.html privacy.html status.json status.schema.json status-contract.md styles.css app.js status.js count.js favicon.svg favicon.ico site.webmanifest robots.txt llms.txt sitemap.xml /usr/share/nginx/html/
RUN build_sha_short="$(printf '%s' "${BUILD_SHA}" | cut -c1-7)" \
    && sed -i \
      -e "s/__BUILD_SHA__/${BUILD_SHA}/g" \
      -e "s/__BUILD_SHA_SHORT__/${build_sha_short}/g" \
      /usr/share/nginx/html/index.html \
      /usr/share/nginx/html/reliability.html \
      /usr/share/nginx/html/status.html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["wget", "--spider", "--quiet", "http://127.0.0.1:8080/health"]

USER 101:101
CMD ["nginx", "-g", "daemon off;"]
