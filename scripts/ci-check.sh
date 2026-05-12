#!/usr/bin/env bash
set -e

# Install dependencies
npm ci

# Ensure Prisma client is generated AFTER npm ci
npm run generate

# Lint code
npm run lint:check

# Build the project
npm run build

# Validate Prisma schema
npm run prisma:validate

# Apply schema changes directly
npx prisma db push --schema=./prisma/postgres/schema.prisma --accept-data-loss

# Run end-to-end tests
npm run test:e2e:ci

echo "✅ CI is successful in the end!"
