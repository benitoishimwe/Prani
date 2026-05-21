FROM node:20-alpine

# OpenSSL is required by the Prisma query engine at runtime
RUN apk add --no-cache openssl

WORKDIR /app

# Install all deps (including devDeps so prisma CLI is available)
COPY package*.json ./
# Prisma schema must exist before npm ci so the postinstall `prisma generate` succeeds
COPY prisma ./prisma/
RUN npm ci

# Copy application source
COPY . .

# Remove dev-only packages (generated Prisma client in node_modules/.prisma stays)
RUN npm prune --production

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
