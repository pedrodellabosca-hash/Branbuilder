#!/bin/sh
set -e

echo "==========================================="
echo "  Brandforge Production Startup"
echo "==========================================="
echo ""

# Check required environment variables
check_env() {
    if [ -z "${!1}" ]; then
        echo "❌ ERROR: $1 is not set"
        exit 1
    fi
    echo "  ✓ $1 is set"
}

echo "📋 Checking required environment variables..."
check_env DATABASE_URL
check_env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
check_env CLERK_SECRET_KEY
echo ""

# Optional variables with defaults
AI_PROVIDER="${AI_PROVIDER:-MOCK}"
echo "ℹ️  AI_PROVIDER: $AI_PROVIDER"
echo ""

# Wait for database to be ready
echo "⏳ Waiting for database..."
MAX_RETRIES=30
RETRY_COUNT=0

until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Database connection failed after ${MAX_RETRIES} attempts"
        exit 1
    fi
    echo "  Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done
echo "✅ Database is ready"
echo ""

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy
echo "✅ Migrations complete"
echo ""

# Start PM2 with ecosystem config
echo "🚀 Starting services with PM2..."
echo "   - web:    Next.js server on port ${PORT:-3000}"
echo "   - worker: Background job processor"
echo ""

# PM2 runtime keeps the process in foreground and handles signals
exec pm2-runtime ecosystem.config.cjs
