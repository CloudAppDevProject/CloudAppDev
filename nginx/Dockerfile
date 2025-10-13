FROM nginx:alpine

# inotify-tools lets us watch cert files and reload nginx automatically
RUN apk add --no-cache inotify-tools gettext

# templates and entrypoint
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV DOMAIN=example.com

# Use our entrypoint to wait for certs, render config, start nginx, and watch for renewals
ENTRYPOINT ["/entrypoint.sh"]
