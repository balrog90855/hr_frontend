# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy source and build in production mode
COPY . .
RUN npm run build -- --configuration production

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

# Replace default Nginx config with our custom one
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled Angular app from builder stage
# Angular 18 outputs browser files to dist/<project>/browser
COPY --from=builder /app/dist/talent-network/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
