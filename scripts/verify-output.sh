#!/bin/bash
set -euo pipefail

# Verify output endpoint behavior
#
# USAGE:
#   Terminal 1: npm run dev
#   Terminal 2: npm run verify:output
#
# Exit 0 = OK, Exit 1 = FAIL

BASE_URL="${1:-http://localhost:3000}"
FAILED=0

# Check if server is running
if ! curl -s --connect-timeout 2 "${BASE_URL}" > /dev/null 2>&1; then
    echo "❌ Server not running at ${BASE_URL}"
    echo "   Run 'npm run dev' first"
    exit 1
fi

echo "📦 Output Endpoint Verification Tests"
echo "======================================"
echo ""

# Test 1: POST to run without auth should return 401 JSON
echo "Test 1: POST /api/projects/test/stages/naming/run (no auth -> 401)"
RUN_RESPONSE=$(curl -si -X POST "${BASE_URL}/api/projects/test/stages/naming/run" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    2>&1)
RUN_STATUS=$(echo "$RUN_RESPONSE" | head -1)

if echo "$RUN_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ✅ Status: 401 Unauthorized"
else
    echo "  ❌ FAIL: Expected 401, got: $RUN_STATUS"
    FAILED=1
fi

if echo "$RUN_RESPONSE" | grep -qi "^content-type:.*application/json"; then
    echo "  ✅ Content-Type: application/json"
else
    echo "  ❌ FAIL: Expected application/json"
    FAILED=1
fi

if echo "$RUN_RESPONSE" | grep -qi "^cache-control:.*no-store"; then
    echo "  ✅ Cache-Control: no-store"
else
    echo "  ⚠️  Warning: Cache-Control no-store not found"
fi

if echo "$RUN_RESPONSE" | grep -qi "^vary:.*cookie"; then
    echo "  ✅ Vary: Cookie"
else
    echo "  ⚠️  Warning: Vary: Cookie not found"
fi

if echo "$RUN_RESPONSE" | grep -qi '^location:'; then
    echo "  ❌ FAIL: Found redirect (should be 401 JSON)"
    FAILED=1
else
    echo "  ✅ No redirect"
fi
echo ""

# Test 2: GET output without auth should return 401 JSON
echo "Test 2: GET /api/projects/test/stages/naming/output (no auth -> 401)"
OUTPUT_RESPONSE=$(curl -si "${BASE_URL}/api/projects/test/stages/naming/output" \
    -H "Accept: application/json" \
    2>&1)
OUTPUT_STATUS=$(echo "$OUTPUT_RESPONSE" | head -1)

if echo "$OUTPUT_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ✅ Status: 401 Unauthorized"
else
    echo "  ❌ FAIL: Expected 401, got: $OUTPUT_STATUS"
    FAILED=1
fi

if echo "$OUTPUT_RESPONSE" | grep -qi "^content-type:.*application/json"; then
    echo "  ✅ Content-Type: application/json"
else
    echo "  ❌ FAIL: Expected application/json"
    FAILED=1
fi

if echo "$OUTPUT_RESPONSE" | grep -qi '^location:'; then
    echo "  ❌ FAIL: Found redirect (should be 401 JSON)"
    FAILED=1
else
    echo "  ✅ No redirect"
fi
echo ""

# Summary
echo "======================================"
if [ $FAILED -eq 0 ]; then
    echo "✅ All output tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
