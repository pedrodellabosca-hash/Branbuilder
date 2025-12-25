#!/bin/bash
set -euo pipefail

# Verify stage run endpoint behavior with header checks
# Usage: ./scripts/verify-stage-run.sh [base_url]
# Exit 0 = OK, Exit 1 = FAIL

BASE_URL="${1:-http://localhost:3000}"
FAILED=0

echo "🚀 Stage Run Verification Tests"
echo "================================"
echo ""

# Test 1: POST to run without auth should return 401 JSON with proper headers
echo "Test 1: POST /api/projects/test/stages/naming/run (no auth -> 401)"
RUN_RESPONSE=$(curl -si -X POST "${BASE_URL}/api/projects/test/stages/naming/run" \
    -H "Content-Type: application/json" 2>&1)
RUN_STATUS=$(echo "$RUN_RESPONSE" | head -1)

if echo "$RUN_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ✅ Status: 401 Unauthorized"
else
    echo "  ❌ FAIL: Expected 401, got: $RUN_STATUS"
    FAILED=1
fi

if echo "$RUN_RESPONSE" | grep -qi "content-type.*application/json"; then
    echo "  ✅ Content-Type: application/json"
else
    echo "  ❌ FAIL: Expected JSON content-type"
    FAILED=1
fi

if echo "$RUN_RESPONSE" | grep -qi "cache-control.*no-store"; then
    echo "  ✅ Cache-Control: no-store"
else
    echo "  ⚠️  Warning: Cache-Control no-store not found"
fi

if echo "$RUN_RESPONSE" | grep -qi "vary.*cookie"; then
    echo "  ✅ Vary: Cookie"
else
    echo "  ⚠️  Warning: Vary: Cookie not found"
fi

# Check no redirect/rewrite
if echo "$RUN_RESPONSE" | grep -qi '^location:'; then
    echo "  ❌ FAIL: Found Location header (should not redirect)"
    FAILED=1
else
    echo "  ✅ No redirect"
fi
echo ""

# Test 2: GET output without auth should return 401 JSON
echo "Test 2: GET /api/projects/test/stages/naming/output (no auth -> 401)"
OUTPUT_RESPONSE=$(curl -si "${BASE_URL}/api/projects/test/stages/naming/output" 2>&1)
OUTPUT_STATUS=$(echo "$OUTPUT_RESPONSE" | head -1)

if echo "$OUTPUT_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ✅ Status: 401 Unauthorized"
else
    echo "  ❌ FAIL: Expected 401, got: $OUTPUT_STATUS"
    FAILED=1
fi

if echo "$OUTPUT_RESPONSE" | grep -qi "content-type.*application/json"; then
    echo "  ✅ Content-Type: application/json"
else
    echo "  ❌ FAIL: Expected JSON content-type"
    FAILED=1
fi

if echo "$OUTPUT_RESPONSE" | grep -qi '^location:'; then
    echo "  ❌ FAIL: Found Location header (should not redirect)"
    FAILED=1
else
    echo "  ✅ No redirect"
fi
echo ""

# Test 3: Verify /api/ai/ping still bypasses middleware
echo "Test 3: /api/ai/ping (should still bypass middleware)"
PING_HEADERS=$(curl -sI "${BASE_URL}/api/ai/ping" 2>&1)

if echo "$PING_HEADERS" | grep -qiE 'x-clerk|x-middleware'; then
    echo "  ❌ FAIL: Found Clerk/middleware headers on ping"
    FAILED=1
else
    echo "  ✅ No Clerk headers on ping"
fi

if echo "$PING_HEADERS" | grep -qE '^HTTP/.* 200'; then
    echo "  ✅ Ping status: 200 OK"
else
    echo "  ❌ FAIL: Ping status is not 200"
    FAILED=1
fi
echo ""

# Summary
echo "================================"
if [ $FAILED -eq 0 ]; then
    echo "✅ All stage tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
