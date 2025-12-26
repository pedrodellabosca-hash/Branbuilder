#!/bin/bash
set -euo pipefail

# =============================================================================
# Verify Model Registry API
# =============================================================================
#
# Tests that /api/models returns valid model registry data:
#   1. Endpoint responds with 200
#   2. Response contains providers array
#   3. Response contains models array with expected structure
#   4. Response contains defaultsByPreset
#
# USAGE:
#   npm run verify:models
#   ./scripts/verify-models.sh
#
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILED=0

echo "🤖 Model Registry API Tests"
echo "============================"
echo ""

# Check if server is running
if ! curl -s --connect-timeout 2 "${BASE_URL}" > /dev/null 2>&1; then
    echo "❌ Server not running at ${BASE_URL}"
    echo "   Run 'npm run dev' first"
    exit 1
fi
echo "✅ Server is running"
echo ""

# =============================================================================
# Test 1: GET /api/models returns 200
# =============================================================================
echo "Test 1: GET /api/models returns 200"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/models")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ Status 200"
else
    echo "  ❌ FAIL: Expected 200, got $HTTP_CODE"
    FAILED=1
fi
echo ""

# =============================================================================
# Test 2: Response contains providers array
# =============================================================================
echo "Test 2: Response contains providers array"
echo "------------------------------------------"
if echo "$BODY" | grep -q '"providers":\['; then
    echo "  ✅ providers array present"
else
    echo "  ❌ FAIL: providers array missing"
    FAILED=1
fi
echo ""

# =============================================================================
# Test 3: Response contains models array
# =============================================================================
echo "Test 3: Response contains models array"
echo "---------------------------------------"
if echo "$BODY" | grep -q '"models":\['; then
    echo "  ✅ models array present"
    
    # Check for expected model structure
    if echo "$BODY" | grep -q '"id":'; then
        echo "  ✅ models have id field"
    else
        echo "  ⚠️  models missing id field"
    fi
    
    if echo "$BODY" | grep -q '"provider":'; then
        echo "  ✅ models have provider field"
    else
        echo "  ⚠️  models missing provider field"
    fi
    
    if echo "$BODY" | grep -q '"label":'; then
        echo "  ✅ models have label field"
    else
        echo "  ⚠️  models missing label field"
    fi
else
    echo "  ❌ FAIL: models array missing"
    FAILED=1
fi
echo ""

# =============================================================================
# Test 4: Response contains defaultsByPreset
# =============================================================================
echo "Test 4: Response contains defaultsByPreset"
echo "-------------------------------------------"
if echo "$BODY" | grep -q '"defaultsByPreset":{'; then
    echo "  ✅ defaultsByPreset present"
    
    if echo "$BODY" | grep -q '"fast":'; then
        echo "  ✅ fast preset default present"
    fi
    if echo "$BODY" | grep -q '"balanced":'; then
        echo "  ✅ balanced preset default present"
    fi
    if echo "$BODY" | grep -q '"quality":'; then
        echo "  ✅ quality preset default present"
    fi
else
    echo "  ❌ FAIL: defaultsByPreset missing"
    FAILED=1
fi
echo ""

# =============================================================================
# Summary
# =============================================================================
echo "============================"
if [ $FAILED -eq 0 ]; then
    echo "✅ All model registry tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
