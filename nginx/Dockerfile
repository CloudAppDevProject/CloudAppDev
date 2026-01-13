FROM nginx:alpine

# inotify-tools lets us watch cert files and reload nginx automatically
RUN apk add --no-cache inotify-tools gettext

# Copy gateway configuration template
COPY templates/gateway.conf.template /etc/nginx/templates/gateway.conf.template

# templates and entrypoint
COPY conf/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default environment variables (can be overridden)
ENV DOMAIN=example.com
ENV RESOLVER_IP=kube-dns.kube-system.svc.cluster.local
ENV USER_NAMESPACE=default
ENV ITINERARY_NAMESPACE=default
ENV SOCIAL_NAMESPACE=default
ENV TRAVEL_INFO_NAMESPACE=default
ENV TENANT_NAMESPACE=default

# Use our entrypoint to wait for certs, render config, start nginx, and watch for renewals
ENTRYPOINT ["/entrypoint.sh"]
