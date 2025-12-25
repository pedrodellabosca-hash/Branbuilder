#!/bin/bash
set -euo pipefail

# Verify auth behavior for different routes
#
# USAGE:
#   Terminal 1: npm run dev
#   Terminal 2: npm run verify:auth
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

echo "🔐 Auth Verification Tests"
echo "=========================="
echo ""

# Test 1: /api/ai/ping should be 200 and BYPASS middleware entirely
echo "Test 1: /api/ai/ping (should bypass middleware completely)"
PING_HEADERS=$(curl -sI "${BASE_URL}/api/ai/ping" -H "Accept: application/json" 2>&1)

if echo "$PING_HEADERS" | grep -qiE '^x-clerk|^x-middleware'; then
    echo "  ❌ FAIL: Found Clerk/middleware headers (ping should bypass)"
    FAILED=1
else
    echo "  ✅ No Clerk/middleware headers"
fi

if echo "$PING_HEADERS" | grep -qE '^HTTP/.* 200'; then
    echo "  ✅ Status: 200 OK"
else
    echo "  ❌ FAIL: Status is not 200"
    FAILED=1
fi
echo ""

# Test 2: /api/projects without auth should return 401 JSON
echo "Test 2: /api/projects (should be 401 JSON, no redirect/rewrite)"
PROJECTS_RESPONSE=$(curl -si "${BASE_URL}/api/projects" -H "Accept: application/json" 2>&1)
PROJECTS_STATUS=$(echo "$PROJECTS_RESPONSE" | head -1)

if echo "$PROJECTS_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ✅ Status: 401 Unauthorized"
else
    echo "  ❌ FAIL: Expected 401, got: $PROJECTS_STATUS"
    FAILED=1
fi

if echo "$PROJECTS_RESPONSE" | grep -qi "^content-type:.*application/json"; then
    echo "  ✅ Content-Type: application/json"
else
    echo "  ❌ FAIL: Expected application/json"
    FAILED=1
fi

if echo "$PROJECTS_RESPONSE" | grep -qi "^cache-control:.*no-store"; then
    echo "  ✅ Cache-Control: no-store"
else
    echo "  ⚠️  Warning: Cache-Control no-store not found"
fi

if echo "$PROJECTS_RESPONSE" | grep -qi "^vary:.*cookie"; then
    echo "  ✅ Vary: Cookie"
else
    echo "  ⚠️  Warning: Vary: Cookie not found"
fi

if echo "$PROJECTS_RESPONSE" | grep -qi '^location:'; then
    echo "  ❌ FAIL: Found Location header (should not redirect)"
    FAILED=1
else
    echo "  ✅ No redirect (no Location header)"
fi

if echo "$PROJECTS_RESPONSE" | grep -qiE '^x-middleware-rewrite'; then
    echo "  ❌ FAIL: Found x-middleware-rewrite (should not rewrite)"
    FAILED=1
else
    echo "  ✅ No rewrite headers"
fi

if echo "$PROJECTS_RESPONSE" | grep -qiE '^x-clerk'; then
    echo "  ℹ️  x-clerk-* headers present (OK for protected routes)"
fi
echo ""

# Test 3: UI route "/" should NOT return 401 JSON
echo "Test 3: / (UI route, should be 200 or redirect, NOT 401)"
HOME_RESPONSE=$(curl -sI "${BASE_URL}/" 2>&1)
HOME_STATUS=$(echo "$HOME_RESPONSE" | head -1)

if echo "$HOME_RESPONSE" | grep -qiE '^x-middleware-rewrite.*clerk'; then
    echo "  ❌ FAIL: Found x-middleware-rewrite to Clerk"
    FAILED=1
elif echo "$HOME_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ❌ FAIL: UI route returned 401 (should redirect or be 200)"
    FAILED=1
elif echo "$HOME_STATUS" | grep -qE '^HTTP/.* 200'; then
    echo "  ✅ Status: 200 OK (home is public)"
elif echo "$HOME_STATUS" | grep -qE '^HTTP/.* (302|307|308)'; then
    LOCATION=$(echo "$HOME_RESPONSE" | grep -i "^location:" | head -1)
    if echo "$LOCATION" | grep -qi "sign-in"; then
        echo "  ✅ Status: Redirect to sign-in (home is protected)"
    else
        echo "  ✅ Status: Redirect (location: $LOCATION)"
    fi
else
    echo "  ⚠️  Unexpected status: $HOME_STATUS"
fi
echo ""

# Summary
echo "=========================="
if [ $FAILED -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
