#!/bin/bash
set -euo pipefail

# Run all verification tests with server auto-start (optional)
#
# USAGE:
#   Option A (manual server):
#     Terminal 1: npm run dev
#     Terminal 2: npm run verify:all
#
#   Option B (auto-start):
#     ./scripts/verify-local.sh
#
# Exit 0 = OK, Exit 1 = FAIL

BASE_URL="${1:-http://localhost:3000}"
DEV_PID=""

cleanup() {
    if [ -n "$DEV_PID" ]; then
        echo ""
        echo "🛑 Stopping dev server (PID: $DEV_PID)..."
        kill "$DEV_PID" 2>/dev/null || true
        wait "$DEV_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT

echo "🚀 Local Verification Suite"
echo "============================"
echo ""

# Check if server is already running
if curl -s --connect-timeout 2 "${BASE_URL}" > /dev/null 2>&1; then
    echo "✅ Server already running at ${BASE_URL}"
else
    echo "📦 Starting dev server..."
    npm run dev > /dev/null 2>&1 &
    DEV_PID=$!
    
    # Wait for server to be ready (max 30s)
    echo "⏳ Waiting for server to start..."
    for i in {1..30}; do
        if curl -s --connect-timeout 1 "${BASE_URL}/api/ai/ping" > /dev/null 2>&1; then
            echo "✅ Server ready after ${i}s"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Server failed to start after 30s"
            exit 1
        fi
        sleep 1
    done
fi

echo ""
echo "Running verification tests..."
echo ""

# Run all tests
FAILED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/verify-ping.sh "$BASE_URL" || FAILED=1
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/verify-auth.sh "$BASE_URL" || FAILED=1
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/verify-stage-run.sh "$BASE_URL" || FAILED=1
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/verify-openai.sh "$BASE_URL" || FAILED=1
echo ""

echo "============================"
if [ $FAILED -eq 0 ]; then
    echo "✅ ALL TESTS PASSED"
    exit 0
else
    echo "❌ SOME TESTS FAILED"
    exit 1
fi
