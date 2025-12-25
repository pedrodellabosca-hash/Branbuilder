#!/bin/bash
set -euo pipefail

# Database Bootstrap Script
# Starts local postgres, runs migrations, and prepares the database
#
# USAGE:
#   npm run db:bootstrap
#   # or
#   ./scripts/db-bootstrap.sh
#
# REQUIREMENTS:
#   - Docker installed and running
#   - .env file with DATABASE_URL configured

echo "🗄️  Database Bootstrap"
echo "======================"
echo ""

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    echo "   Install Docker Desktop: https://docker.com/get-started"
    exit 1
fi

# Check if docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    echo "   Start Docker Desktop and try again"
    exit 1
fi

echo "📦 Starting PostgreSQL container..."
docker compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker compose exec -T postgres pg_isready -U brandforge -d brandforge &> /dev/null; then
        echo "✅ Database is ready"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo "❌ Database failed to start after ${MAX_ATTEMPTS}s"
        echo "   Check: docker compose logs postgres"
        exit 1
    fi
    sleep 1
done

echo ""
echo "🔄 Generating Prisma client..."
npm run db:generate

echo ""
echo "🔄 Running database migrations..."
npm run db:migrate

echo ""
# Try to run seed if it exists
if grep -q '"db:seed"' package.json; then
    echo "🌱 Running database seed..."
    npm run db:seed || echo "⚠️  Seed failed or no seed data (continuing anyway)"
else
    echo "ℹ️  No db:seed script found (skipping)"
fi

echo ""
echo "======================"
echo "✅ Database is ready!"
echo ""
echo "Next steps:"
echo "  npm run dev          # Start development server"
echo "  npm run db:studio    # Open Prisma Studio (database GUI)"
echo ""
