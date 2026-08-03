FROM docker.io/library/nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html styles.css app.js /usr/share/nginx/html/

EXPOSE 8080
