FROM node:20-alpine

WORKDIR /app

# Install all deps (including devDeps so prisma CLI is available)
COPY package*.json ./
RUN npm ci

# Copy prisma schema and generate the Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application source
COPY . .

# Remove dev-only packages (generated Prisma client in node_modules/.prisma stays)
RUN npm prune --production

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
