#!/bin/bash
# Verify that /api/ai/ping is truly public (no Clerk middleware)
# Usage: ./scripts/verify-ping.sh [base_url]
# Exit 0 = OK, Exit 1 = FAIL

BASE_URL="${1:-http://localhost:3000}"
ENDPOINT="${BASE_URL}/api/ai/ping"

echo "🔍 Checking: ${ENDPOINT}"
echo ""

# Fetch headers
HEADERS=$(curl -sI "${ENDPOINT}" 2>&1)

# Check for forbidden headers
if echo "$HEADERS" | grep -qiE 'x-clerk|x-middleware'; then
    echo "❌ FAIL: Found Clerk/middleware headers!"
    echo ""
    echo "$HEADERS" | grep -iE 'x-clerk|x-middleware'
    exit 1
fi

# Check for expected headers
if echo "$HEADERS" | grep -qi 'cache-control'; then
    echo "✅ cache-control header present"
else
    echo "⚠️  Warning: cache-control header missing"
fi

if echo "$HEADERS" | grep -qi 'application/json'; then
    echo "✅ content-type: application/json"
else
    echo "⚠️  Warning: content-type may not be JSON"
fi

# Check status code
if echo "$HEADERS" | grep -qE '^HTTP/.* 200'; then
    echo "✅ Status: 200 OK"
else
    echo "❌ FAIL: Status is not 200"
    echo "$HEADERS" | head -1
    exit 1
fi

echo ""
echo "✅ PASS: /api/ai/ping is properly public"
exit 0
