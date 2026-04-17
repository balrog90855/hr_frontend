FROM nginxinc/nginx-unprivileged:alpine

# Allow the entrypoint to render config templates at container start, including on
# OpenShift where the container may run with an arbitrary UID in group 0.
USER root
RUN mkdir -p /etc/nginx/templates \
	&& chgrp -R 0 /etc/nginx/conf.d /etc/nginx/templates \
	&& chmod -R g=u /etc/nginx/conf.d /etc/nginx/templates

# Render the server config from a template so runtime env vars can be injected.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy existing production build assets into the nginx web root
COPY dist/talent-network/browser /usr/share/nginx/html

ENV BACKEND_SERVER=backend-service
ENV BACKEND_PORT=8000
ENV NGINX_ENVSUBST_FILTER=BACKEND_SERVER|BACKEND_PORT

EXPOSE 8080

USER 101
CMD ["nginx", "-g", "daemon off;"]
