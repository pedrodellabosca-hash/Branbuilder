#!/bin/bash
# Verify auth behavior for different routes
# Usage: ./scripts/verify-auth.sh [base_url]
# Exit 0 = OK, Exit 1 = FAIL

BASE_URL="${1:-http://localhost:3000}"
FAILED=0

echo "🔐 Auth Verification Tests"
echo "=========================="
echo ""

# Test 1: /api/ai/ping should be 200 and public (no middleware)
echo "Test 1: /api/ai/ping (should be 200, no x-clerk headers)"
PING_HEADERS=$(curl -sI "${BASE_URL}/api/ai/ping" 2>&1)

if echo "$PING_HEADERS" | grep -qiE 'x-clerk|x-middleware'; then
    echo "  ❌ FAIL: Found Clerk/middleware headers on ping"
    FAILED=1
else
    echo "  ✅ No Clerk headers"
fi

if echo "$PING_HEADERS" | grep -qE '^HTTP/.* 200'; then
    echo "  ✅ Status: 200 OK"
else
    echo "  ❌ FAIL: Status is not 200"
    FAILED=1
fi
echo ""

# Test 2: /api/projects without auth should return 401 JSON
echo "Test 2: /api/projects (should be 401 JSON, no redirect)"
PROJECTS_RESPONSE=$(curl -si "${BASE_URL}/api/projects" 2>&1)
PROJECTS_STATUS=$(echo "$PROJECTS_RESPONSE" | head -1)
PROJECTS_CONTENT_TYPE=$(echo "$PROJECTS_RESPONSE" | grep -i "content-type")

if echo "$PROJECTS_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ✅ Status: 401 Unauthorized"
else
    echo "  ❌ FAIL: Expected 401, got: $PROJECTS_STATUS"
    FAILED=1
fi

if echo "$PROJECTS_CONTENT_TYPE" | grep -qi "application/json"; then
    echo "  ✅ Content-Type: application/json"
else
    echo "  ❌ FAIL: Expected JSON, got: $PROJECTS_CONTENT_TYPE"
    FAILED=1
fi

if echo "$PROJECTS_RESPONSE" | grep -qiE 'x-middleware-rewrite'; then
    echo "  ❌ FAIL: Found x-middleware-rewrite (should not redirect)"
    FAILED=1
else
    echo "  ✅ No rewrite headers"
fi
echo ""

# Test 3: UI route without auth should redirect to sign-in
echo "Test 3: /projects (UI route, should redirect to sign-in)"
PROJECTS_UI=$(curl -sI "${BASE_URL}/projects" 2>&1)
PROJECTS_UI_STATUS=$(echo "$PROJECTS_UI" | head -1)

if echo "$PROJECTS_UI_STATUS" | grep -qE '^HTTP/.* (302|307|308)'; then
    echo "  ✅ Status: Redirect"
    LOCATION=$(echo "$PROJECTS_UI" | grep -i "location" | head -1)
    if echo "$LOCATION" | grep -qi "sign-in"; then
        echo "  ✅ Redirects to sign-in"
    else
        echo "  ⚠️  Redirect location: $LOCATION"
    fi
else
    echo "  ⚠️  Status: $PROJECTS_UI_STATUS (expected redirect)"
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
