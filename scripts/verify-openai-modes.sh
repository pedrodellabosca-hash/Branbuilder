#!/bin/bash
set -euo pipefail

# Verify OpenAI provider in different modes
#
# USAGE:
#   ./scripts/verify-openai-modes.sh
#   npm run verify:openai:modes
#
# Tests:
#   1. OPENAI without API key -> ready:false, error present
#   2. OPENAI with API key (if available) -> ready:true
#
# Uses PORT 3010 to avoid conflict with user's dev server

PORT=3010
BASE_URL="http://localhost:${PORT}"
PID_FILE="/tmp/dev-openai-test.pid"
LOG_FILE="/tmp/dev-openai-test.log"

cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            sleep 1
            kill -9 "$PID" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
    rm -f "$LOG_FILE"
}

trap cleanup EXIT

wait_for_server() {
    local max_attempts=30
    local attempt=0
    echo "  ⏳ Waiting for server on port ${PORT}..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s --connect-timeout 1 "${BASE_URL}/api/ai/ping" > /dev/null 2>&1; then
            echo "  ✅ Server ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    echo "  ❌ Server failed to start (timeout)"
    echo "  📋 Last 20 lines of log:"
    tail -20 "$LOG_FILE" 2>/dev/null || echo "  (no log available)"
    return 1
}

echo "🔐 OpenAI Provider Mode Tests"
echo "=============================="
echo ""
FAILED=0

# =============================================================================
# TEST 1: OPENAI without API key
# =============================================================================
echo "Test 1: OPENAI mode without API key"
echo "------------------------------------"

# Start server with OPENAI provider but NO key
echo "  📦 Starting server (OPENAI, no key)..."
(
    cd "$(dirname "$0")/.."
    OPENAI_API_KEY="" AI_PROVIDER=OPENAI PORT=$PORT npm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
)

if ! wait_for_server; then
    FAILED=1
else
    # Test ping response
    RESPONSE=$(curl -s "${BASE_URL}/api/ai/ping" -H "Accept: application/json" 2>&1)
    HEADERS=$(curl -sI "${BASE_URL}/api/ai/ping" -H "Accept: application/json" 2>&1)
    
    # Check provider is OPENAI
    if echo "$RESPONSE" | grep -qi '"provider"[[:space:]]*:[[:space:]]*"OPENAI"'; then
        echo "  ✅ provider: OPENAI"
    else
        echo "  ❌ FAIL: Expected provider:OPENAI"
        echo "  Response: $RESPONSE"
        FAILED=1
    fi
    
    # Check ready is false
    if echo "$RESPONSE" | grep -qi '"ready"[[:space:]]*:[[:space:]]*false'; then
        echo "  ✅ ready: false"
    else
        echo "  ❌ FAIL: Expected ready:false"
        FAILED=1
    fi
    
    # Check error is present
    if echo "$RESPONSE" | grep -qiE '"error"[[:space:]]*:[[:space:]]*"[^"]+"'; then
        ERROR=$(echo "$RESPONSE" | grep -oE '"error"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1)
        echo "  ✅ error present: ${ERROR}"
    else
        echo "  ❌ FAIL: Expected error message"
        FAILED=1
    fi
    
    # Check no Clerk headers
    if echo "$HEADERS" | grep -qiE '^x-clerk|^x-middleware'; then
        echo "  ❌ FAIL: Found Clerk/middleware headers"
        FAILED=1
    else
        echo "  ✅ No Clerk headers (bypass OK)"
    fi
    
    # Check cache headers
    if echo "$HEADERS" | grep -qi "^cache-control:.*no-store"; then
        echo "  ✅ Cache-Control: no-store"
    else
        echo "  ⚠️  Warning: Cache-Control no-store not found"
    fi
fi

# Stop server
cleanup

echo ""

# =============================================================================
# TEST 2: OPENAI with API key (if available)
# =============================================================================
echo "Test 2: OPENAI mode with API key"
echo "---------------------------------"

# Try to get API key from env or .env file
API_KEY=""
if [ -n "${OPENAI_API_KEY:-}" ]; then
    API_KEY="$OPENAI_API_KEY"
elif [ -f "$(dirname "$0")/../.env" ]; then
    # Read from .env but don't print it
    API_KEY=$(grep -E '^OPENAI_API_KEY=' "$(dirname "$0")/../.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")
fi

# Check if key looks valid (starts with sk-)
if [ -z "$API_KEY" ] || [ "${API_KEY:0:3}" != "sk-" ]; then
    echo "  ⏭️  SKIP: OPENAI_API_KEY not set or invalid"
    echo "  (Set OPENAI_API_KEY=sk-... in env or .env to enable this test)"
    echo ""
else
    echo "  📦 Starting server (OPENAI, with key)..."
    (
        cd "$(dirname "$0")/.."
        OPENAI_API_KEY="$API_KEY" AI_PROVIDER=OPENAI PORT=$PORT npm run dev > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
    )
    
    if ! wait_for_server; then
        FAILED=1
    else
        RESPONSE=$(curl -s "${BASE_URL}/api/ai/ping" -H "Accept: application/json" 2>&1)
        
        # Check provider is OPENAI
        if echo "$RESPONSE" | grep -qi '"provider"[[:space:]]*:[[:space:]]*"OPENAI"'; then
            echo "  ✅ provider: OPENAI"
        else
            echo "  ❌ FAIL: Expected provider:OPENAI"
            FAILED=1
        fi
        
        # Check ready is true
        if echo "$RESPONSE" | grep -qi '"ready"[[:space:]]*:[[:space:]]*true'; then
            echo "  ✅ ready: true"
        else
            echo "  ❌ FAIL: Expected ready:true"
            echo "  Response: $RESPONSE"
            FAILED=1
        fi
        
        # Check error is null
        if echo "$RESPONSE" | grep -qi '"error"[[:space:]]*:[[:space:]]*null'; then
            echo "  ✅ error: null"
        else
            echo "  ⚠️  Warning: error field not null (may still be valid)"
        fi
    fi
fi

echo ""
echo "=============================="
if [ $FAILED -eq 0 ]; then
    echo "✅ All OpenAI mode tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
