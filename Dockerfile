FROM docker.io/library/nginx:1.27-alpine

ARG BUILD_SHA=dev

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html privacy.html styles.css app.js count.js favicon.svg favicon.ico site.webmanifest robots.txt llms.txt sitemap.xml /usr/share/nginx/html/
RUN build_sha_short="$(printf '%s' "${BUILD_SHA}" | cut -c1-7)" \
    && sed -i \
      -e "s/__BUILD_SHA__/${BUILD_SHA}/g" \
      -e "s/__BUILD_SHA_SHORT__/${build_sha_short}/g" \
      /usr/share/nginx/html/index.html

EXPOSE 8080
