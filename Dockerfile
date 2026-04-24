# Stage 1: Build
FROM node:22-slim AS builder
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source and generate prisma
COPY . .
RUN npx prisma generate --schema=prisma/postgres/schema.prisma
RUN npm run build

# Stage 2: Production
FROM node:22-slim AS production
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Only copy production-essential files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and generated Prisma clients
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@internal ./node_modules/@internal
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma.config.js ./

CMD npx prisma migrate deploy --schema=./prisma/postgres/schema.prisma && npm run start:prod
