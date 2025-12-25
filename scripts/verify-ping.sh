#!/bin/bash
set -euo pipefail

# Verify that /api/ai/ping is truly public (no Clerk middleware)
# 
# USAGE:
#   Terminal 1: npm run dev
#   Terminal 2: npm run verify:ping
#
# Exit 0 = OK, Exit 1 = FAIL

BASE_URL="${1:-http://localhost:3000}"
ENDPOINT="${BASE_URL}/api/ai/ping"

echo "🔍 Ping Endpoint Verification"
echo "=============================="
echo ""

# Check if server is running
echo "Checking server at ${BASE_URL}..."
if ! curl -s --connect-timeout 2 "${BASE_URL}" > /dev/null 2>&1; then
    echo ""
    echo "❌ FAIL: Server not running at ${BASE_URL}"
    echo ""
    echo "To fix:"
    echo "  1. Open another terminal"
    echo "  2. Run: npm run dev"
    echo "  3. Wait for 'Ready' message"
    echo "  4. Run this script again"
    echo ""
    exit 1
fi
echo "✅ Server is running"
echo ""

echo "Testing: ${ENDPOINT}"
echo ""

FAILED=0

# Fetch with explicit Accept header
RESPONSE=$(curl -sI "${ENDPOINT}" \
    -H "Accept: application/json" \
    --connect-timeout 5 \
    2>&1)

# Check for redirects first
if echo "$RESPONSE" | grep -qE '^HTTP/.* (301|302|307|308)'; then
    echo "❌ FAIL: Got redirect response"
    LOCATION=$(echo "$RESPONSE" | grep -i "^location:" | head -1 || echo "unknown")
    echo "   Location: $LOCATION"
    FAILED=1
else
    # Check status code
    STATUS_LINE=$(echo "$RESPONSE" | head -1)
    if echo "$STATUS_LINE" | grep -qE '^HTTP/.* 200'; then
        echo "✅ Status: 200 OK"
    else
        echo "❌ FAIL: Expected 200, got: $STATUS_LINE"
        FAILED=1
    fi
fi

# Check for forbidden Clerk/middleware headers
if echo "$RESPONSE" | grep -qiE '^x-clerk|^x-middleware'; then
    echo "❌ FAIL: Found Clerk/middleware headers (ping should bypass)"
    echo "$RESPONSE" | grep -iE '^x-clerk|^x-middleware' | head -3
    FAILED=1
else
    echo "✅ No Clerk/middleware headers"
fi

# Check content-type
if echo "$RESPONSE" | grep -qi "^content-type:.*application/json"; then
    echo "✅ Content-Type: application/json"
else
    CT=$(echo "$RESPONSE" | grep -i "^content-type:" | head -1 || echo "not found")
    echo "⚠️  Warning: Content-Type: $CT"
fi

# Check cache-control
if echo "$RESPONSE" | grep -qi "^cache-control:.*no-store"; then
    echo "✅ Cache-Control includes no-store"
else
    CC=$(echo "$RESPONSE" | grep -i "^cache-control:" | head -1 || echo "not found")
    echo "⚠️  Warning: Cache-Control: $CC"
fi

echo ""
echo "=============================="
if [ $FAILED -eq 0 ]; then
    echo "✅ PASS: /api/ai/ping is properly public"
    exit 0
else
    echo "❌ FAIL: Some checks failed"
    exit 1
fi
