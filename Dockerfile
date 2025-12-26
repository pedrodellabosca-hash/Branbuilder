# =============================================================================
# Production Dockerfile for Brandforge
# =============================================================================
# Runs Next.js server + Worker in a single container using PM2
#
# Build: docker build -t brandforge .
# Run:   docker run -p 3000:3000 --env-file .env.production brandforge
# =============================================================================

# -----------------------------------------------------------------------------
# Base stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies needed for native modules and PM2
RUN apk add --no-cache libc6-compat openssl

# -----------------------------------------------------------------------------
# Dependencies stage
# -----------------------------------------------------------------------------
FROM base AS deps

# Install all dependencies (including dev for build)
COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Builder stage
# -----------------------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Provide dummy values for build (actual values come at runtime)
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_build_placeholder
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN npm run build

# -----------------------------------------------------------------------------
# Production stage
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install PM2 globally
RUN npm install -g pm2

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and migrations for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy worker and lib files
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/node_modules ./node_modules

# Copy PM2 ecosystem config
COPY ecosystem.config.cjs ./

# Copy startup script
COPY scripts/start-prod.sh ./start-prod.sh
RUN chmod +x ./start-prod.sh

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ai/ping || exit 1

# Start with the production script
CMD ["./start-prod.sh"]
