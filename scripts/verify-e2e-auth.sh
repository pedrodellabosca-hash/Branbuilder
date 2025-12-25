#!/bin/bash
set -euo pipefail

# =============================================================================
# Authenticated E2E Verification Script
# =============================================================================
#
# Tests the full authenticated flow: projects -> stage run -> output
#
# USAGE:
#   Option A (env variable):
#     CLERK_COOKIE="__session=..." ./scripts/verify-e2e-auth.sh
#
#   Option B (interactive):
#     ./scripts/verify-e2e-auth.sh
#     (will prompt for cookie)
#
# HOW TO GET CLERK_COOKIE:
#   1. Open browser, sign in to the app
#   2. Open DevTools (F12) → Application → Cookies → localhost
#   3. Find cookie named "__session" and copy its value
#   4. Set: export CLERK_COOKIE="__session=<value>"
#
# IMPORTANT: Cookie value is never printed in logs
#
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILED=0

# Get cookie from env or prompt
COOKIE=""
if [ -n "${CLERK_COOKIE:-}" ]; then
    COOKIE="$CLERK_COOKIE"
    echo "ℹ️  Using CLERK_COOKIE from environment"
else
    echo "🔐 Enter Clerk session cookie (paste and press Enter):"
    echo "   Format: __session=eyJ..."
    read -rs COOKIE
    echo "   (cookie received, not echoed for security)"
fi

if [ -z "$COOKIE" ]; then
    echo "❌ No cookie provided"
    exit 1
fi

# Ensure cookie has proper format for curl
if [[ "$COOKIE" != *"="* ]]; then
    COOKIE="__session=$COOKIE"
fi

echo ""
echo "🧪 Authenticated E2E Verification"
echo "=================================="
echo ""

# Check server is running
echo "Step 0: Check server"
echo "--------------------"
if ! curl -s --connect-timeout 2 "${BASE_URL}" > /dev/null 2>&1; then
    echo "  ❌ Server not running at ${BASE_URL}"
    echo "  Run 'npm run dev' first"
    exit 1
fi
echo "  ✅ Server is running"
echo ""

# =============================================================================
# Step 1: GET /api/projects
# =============================================================================
echo "Step 1: GET /api/projects"
echo "-------------------------"

PROJECTS_RESPONSE=$(curl -s "${BASE_URL}/api/projects" \
    -H "Accept: application/json" \
    -H "Cookie: ${COOKIE}" \
    2>&1)
PROJECTS_STATUS=$(curl -sI "${BASE_URL}/api/projects" \
    -H "Accept: application/json" \
    -H "Cookie: ${COOKIE}" \
    2>&1 | head -1)

if echo "$PROJECTS_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ❌ FAIL: Got 401 - cookie invalid or expired"
    echo "  Please get a fresh cookie from browser DevTools"
    exit 1
fi

if echo "$PROJECTS_STATUS" | grep -qE '^HTTP/.* 200'; then
    echo "  ✅ Status: 200 OK"
else
    echo "  ❌ FAIL: Expected 200, got: $PROJECTS_STATUS"
    FAILED=1
fi

# =============================================================================
# Step 2: Get or create project
# =============================================================================
echo ""
echo "Step 2: Get or create project"
echo "-----------------------------"

PROJECT_ID=""

# Try to parse projects array
if echo "$PROJECTS_RESPONSE" | grep -q '"id"'; then
    # Has at least one project - extract first id
    PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
fi

if [ -n "$PROJECT_ID" ]; then
    echo "  ✅ Using existing project: $PROJECT_ID"
else
    echo "  📦 Creating new project..."
    CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/projects" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -H "Cookie: ${COOKIE}" \
        -d '{"name":"E2E Test Project","description":"Created by verify-e2e-auth.sh"}' \
        2>&1)
    
    PROJECT_ID=$(echo "$CREATE_RESPONSE" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$PROJECT_ID" ]; then
        echo "  ✅ Created project: $PROJECT_ID"
    else
        echo "  ❌ FAIL: Could not create project"
        echo "  Response: $CREATE_RESPONSE"
        exit 1
    fi
fi

# =============================================================================
# Step 3: Run stage
# =============================================================================
echo ""
echo "Step 3: POST /api/projects/{id}/stages/naming/run"
echo "-------------------------------------------------"

RUN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/projects/${PROJECT_ID}/stages/naming/run" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Cookie: ${COOKIE}" \
    2>&1)
RUN_STATUS=$(curl -sI -X POST "${BASE_URL}/api/projects/${PROJECT_ID}/stages/naming/run" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Cookie: ${COOKIE}" \
    2>&1 | head -1)

if echo "$RUN_STATUS" | grep -qE '^HTTP/.* (200|201)'; then
    echo "  ✅ Status: 200/201 OK"
else
    echo "  ❌ FAIL: Expected 200/201, got: $RUN_STATUS"
    echo "  Response: $RUN_RESPONSE"
    FAILED=1
fi

JOB_ID=$(echo "$RUN_RESPONSE" | grep -oE '"jobId"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
JOB_STATUS=$(echo "$RUN_RESPONSE" | grep -oE '"status"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)

if [ -n "$JOB_ID" ]; then
    echo "  ✅ Job ID: $JOB_ID"
    echo "  ℹ️  Initial status: $JOB_STATUS"
else
    echo "  ❌ FAIL: No jobId in response"
    echo "  Response: $RUN_RESPONSE"
    exit 1
fi

# =============================================================================
# Step 4: Poll job status
# =============================================================================
echo ""
echo "Step 4: Poll /api/jobs/{jobId}"
echo "------------------------------"

MAX_ATTEMPTS=60
ATTEMPT=0
FINAL_STATUS=""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    JOB_POLL=$(curl -s "${BASE_URL}/api/jobs/${JOB_ID}" \
        -H "Accept: application/json" \
        -H "Cookie: ${COOKIE}" \
        2>&1)
    
    CURRENT_STATUS=$(echo "$JOB_POLL" | grep -oE '"status"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
    
    if [ "$CURRENT_STATUS" = "DONE" ] || [ "$CURRENT_STATUS" = "FAILED" ]; then
        FINAL_STATUS="$CURRENT_STATUS"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    printf "  ⏳ Waiting... (%ds) status=%s\r" "$ATTEMPT" "$CURRENT_STATUS"
    sleep 1
done

echo ""
if [ "$FINAL_STATUS" = "DONE" ]; then
    echo "  ✅ Job completed: DONE"
elif [ "$FINAL_STATUS" = "FAILED" ]; then
    echo "  ❌ Job completed: FAILED"
    JOB_ERROR=$(echo "$JOB_POLL" | grep -oE '"error"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
    echo "  Error: $JOB_ERROR"
    FAILED=1
else
    echo "  ❌ Timeout waiting for job (${MAX_ATTEMPTS}s)"
    FAILED=1
fi

# =============================================================================
# Step 5: GET output
# =============================================================================
echo ""
echo "Step 5: GET /api/projects/{id}/stages/naming/output"
echo "---------------------------------------------------"

OUTPUT_RESPONSE=$(curl -s "${BASE_URL}/api/projects/${PROJECT_ID}/stages/naming/output" \
    -H "Accept: application/json" \
    -H "Cookie: ${COOKIE}" \
    2>&1)
OUTPUT_STATUS=$(curl -sI "${BASE_URL}/api/projects/${PROJECT_ID}/stages/naming/output" \
    -H "Accept: application/json" \
    -H "Cookie: ${COOKIE}" \
    2>&1 | head -1)

if echo "$OUTPUT_STATUS" | grep -qE '^HTTP/.* 200'; then
    echo "  ✅ Status: 200 OK"
else
    echo "  ❌ FAIL: Expected 200, got: $OUTPUT_STATUS"
    FAILED=1
fi

# Check for versions
if echo "$OUTPUT_RESPONSE" | grep -q '"versions"'; then
    echo "  ✅ Response contains versions array"
else
    echo "  ❌ FAIL: No versions in response"
    FAILED=1
fi

# Check for latestVersion with content
if echo "$OUTPUT_RESPONSE" | grep -q '"latestVersion"'; then
    echo "  ✅ Response contains latestVersion"
    if echo "$OUTPUT_RESPONSE" | grep -q '"content"'; then
        echo "  ✅ latestVersion has content"
    else
        echo "  ⚠️  Warning: latestVersion may not have content"
    fi
else
    echo "  ⚠️  Warning: No latestVersion (may be first run)"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=================================="
if [ $FAILED -eq 0 ]; then
    echo "✅ All authenticated E2E tests passed!"
    echo ""
    echo "Summary:"
    echo "  - Project: $PROJECT_ID"
    echo "  - Stage: naming"
    echo "  - Job: $JOB_ID ($FINAL_STATUS)"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
