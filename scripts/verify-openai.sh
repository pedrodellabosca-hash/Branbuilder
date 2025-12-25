#!/bin/bash
set -euo pipefail

# Verify AI provider configuration
#
# USAGE:
#   Terminal 1: npm run dev
#   Terminal 2: npm run verify:openai
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

echo "🤖 AI Provider Verification Tests"
echo "=================================="
echo ""

# Test 1: /api/ai/ping should respond with provider info
echo "Test 1: /api/ai/ping (should return provider status)"
PING_RESPONSE=$(curl -s "${BASE_URL}/api/ai/ping" -H "Accept: application/json" 2>&1)
PING_HEADERS=$(curl -sI "${BASE_URL}/api/ai/ping" -H "Accept: application/json" 2>&1)
PING_STATUS=$(echo "$PING_HEADERS" | head -1)

if echo "$PING_STATUS" | grep -qE '^HTTP/.* 200'; then
    echo "  ✅ Status: 200 OK"
else
    echo "  ❌ FAIL: Expected 200, got: $PING_STATUS"
    FAILED=1
fi

# Check no Clerk headers (should bypass middleware)
if echo "$PING_HEADERS" | grep -qiE '^x-clerk|^x-middleware'; then
    echo "  ❌ FAIL: Found Clerk/middleware headers on ping"
    FAILED=1
else
    echo "  ✅ No Clerk headers (bypasses middleware)"
fi

# Check response contains provider info
if echo "$PING_RESPONSE" | grep -qi '"provider"'; then
    echo "  ✅ Response contains provider field"
    
    # Extract provider type
    PROVIDER=$(echo "$PING_RESPONSE" | grep -oE '"provider":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    echo "  ℹ️  Provider: $PROVIDER"
    
    # Check ready status
    if echo "$PING_RESPONSE" | grep -qi '"ready":true'; then
        echo "  ✅ Provider ready: true"
    elif echo "$PING_RESPONSE" | grep -qi '"ready":false'; then
        echo "  ⚠️  Provider ready: false (check configuration)"
        ERROR=$(echo "$PING_RESPONSE" | grep -oE '"error":"[^"]*"' | cut -d'"' -f4 || echo "")
        if [ -n "$ERROR" ]; then
            echo "  ℹ️  Error: $ERROR"
        fi
    fi
else
    echo "  ❌ FAIL: Response missing provider field"
    FAILED=1
fi
echo ""

# Test 2: Verify expected AI_PROVIDER env behavior
echo "Test 2: Provider configuration check"
if echo "$PING_RESPONSE" | grep -qi '"provider":"MOCK"'; then
    echo "  ✅ Running in MOCK mode (safe for development)"
elif echo "$PING_RESPONSE" | grep -qi '"provider":"OPENAI"'; then
    echo "  ℹ️  Running in OPENAI mode"
    if echo "$PING_RESPONSE" | grep -qi '"ready":false'; then
        echo "  ⚠️  OpenAI not ready - check OPENAI_API_KEY"
    else
        echo "  ✅ OpenAI provider configured and ready"
    fi
else
    echo "  ⚠️  Unknown provider type"
fi
echo ""

# Summary
echo "=================================="
if [ $FAILED -eq 0 ]; then
    echo "✅ AI provider verification passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
