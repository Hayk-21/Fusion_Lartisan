# L'Artisan Café server — container image for Railway (or any Docker host).
# Data (database, uploads, backups) lives in LARTISAN_DATA_DIR → mount a Volume there so redeploys keep it.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production LARTISAN_DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "src/index.js"]
