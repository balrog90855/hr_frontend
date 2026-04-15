FROM nginx:alpine

# Replace default Nginx config with our custom one
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy existing production build assets into the nginx web root
COPY dist/talent-network/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
