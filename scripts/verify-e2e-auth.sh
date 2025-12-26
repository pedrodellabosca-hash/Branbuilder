#!/bin/bash
set -euo pipefail

# =============================================================================
# Authenticated E2E Verification Script
# =============================================================================
#
# Tests the full authenticated pipeline: Naming → Voice → Visual
#
# MODES:
#   1. CI Mode (recommended for automation):
#      - Set E2E_TEST_SECRET in env
#      - Script auto-generates token via /api/test/auth-token
#      - Uses Authorization: Bearer <token>
#
#   2. Cookie Mode (local testing):
#      - CLERK_COOKIE="__session=..." ./scripts/verify-e2e-auth.sh
#      - Or paste cookie when prompted
#
# USAGE:
#   # CI Mode (requires E2E_TEST_SECRET)
#   E2E_TEST_SECRET="your-secret" ./scripts/verify-e2e-auth.sh
#
#   # Cookie Mode (local)
#   CLERK_COOKIE="__session=..." ./scripts/verify-e2e-auth.sh
#
# HOW TO GET CLERK_COOKIE (local mode):
#   1. Open browser, sign in to the app
#   2. Open DevTools (F12) → Application → Cookies → localhost
#   3. Find cookie named "__session" and copy its value
#
# REQUIREMENTS:
#   - Dev server running (npm run dev)
#   - For CI mode: E2E_TEST_SECRET env var set
#   - For Cookie mode: Valid Clerk session cookie
#
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILED=0

# Job IDs for summary
JOB_ID_NAMING=""
JOB_ID_VOICE=""
JOB_ID_VISUAL=""
PROJECT_ID=""

# Auth mode: token or cookie
AUTH_MODE=""
AUTH_HEADER=""

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

do_request() {
    local method="$1"
    local path="$2"
    local data="${3:-}"
    
    local curl_args=(-s)
    curl_args+=(-X "$method")
    curl_args+=("${BASE_URL}${path}")
    curl_args+=(-H "Accept: application/json")
    
    if [ -n "$AUTH_HEADER" ]; then
        curl_args+=(-H "$AUTH_HEADER")
    fi
    
    if [ -n "$data" ]; then
        curl_args+=(-H "Content-Type: application/json")
        curl_args+=(-d "$data")
    fi
    
    curl "${curl_args[@]}" 2>&1
}

do_request_status() {
    local method="$1"
    local path="$2"
    
    local curl_args=(-sI)
    curl_args+=(-X "$method")
    curl_args+=("${BASE_URL}${path}")
    curl_args+=(-H "Accept: application/json")
    
    if [ -n "$AUTH_HEADER" ]; then
        curl_args+=(-H "$AUTH_HEADER")
    fi
    
    curl "${curl_args[@]}" 2>&1 | head -1
}

poll_job() {
    local job_id="$1"
    local stage_name="$2"
    local max_attempts="${3:-90}"
    local attempt=0
    local final_status=""

    while [ $attempt -lt $max_attempts ]; do
        local job_poll
        job_poll=$(do_request "GET" "/api/jobs/${job_id}")
        
        local current_status
        current_status=$(echo "$job_poll" | grep -oE '"status"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
        
        if [ "$current_status" = "DONE" ] || [ "$current_status" = "FAILED" ]; then
            final_status="$current_status"
            if [ "$current_status" = "FAILED" ]; then
                local job_error
                job_error=$(echo "$job_poll" | grep -oE '"error"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4 || echo "unknown")
                echo "  ❌ Job FAILED: $job_error"
                FAILED=1
                return 1
            fi
            echo "  ✅ Job completed: $final_status"
            return 0
        fi
        
        attempt=$((attempt + 1))
        printf "  ⏳ Polling %s... (%ds) status=%s\r" "$stage_name" "$attempt" "$current_status"
        sleep 1
    done

    echo ""
    echo "  ❌ Timeout waiting for $stage_name job (${max_attempts}s)"
    FAILED=1
    return 1
}

validate_output() {
    local stage_key="$1"
    local stage_name="$2"

    echo ""
    echo "GET /api/projects/{id}/stages/${stage_key}/output"
    echo "---------------------------------------------------"

    local output_response
    output_response=$(do_request "GET" "/api/projects/${PROJECT_ID}/stages/${stage_key}/output")
    local output_status
    output_status=$(do_request_status "GET" "/api/projects/${PROJECT_ID}/stages/${stage_key}/output")

    if echo "$output_status" | grep -qE '^HTTP/.* 200'; then
        echo "  ✅ Status: 200 OK"
    else
        echo "  ❌ FAIL: Expected 200, got: $output_status"
        FAILED=1
        return 1
    fi

    if echo "$output_response" | grep -q '"versions"'; then
        if echo "$output_response" | grep -qE '"versions"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{'; then
            echo "  ✅ versions array is non-empty"
        else
            echo "  ⚠️  Warning: versions may be empty"
        fi
    else
        echo "  ❌ FAIL: No versions in response"
        FAILED=1
    fi

    if echo "$output_response" | grep -q '"latestVersion"'; then
        echo "  ✅ Response contains latestVersion"
        if echo "$output_response" | grep -qE '"content"[[:space:]]*:[[:space:]]*[^n]'; then
            echo "  ✅ latestVersion.content exists"
        fi
    else
        echo "  ❌ FAIL: No latestVersion in response"
        FAILED=1
    fi
}

run_stage() {
    local stage_key="$1"
    local stage_name="$2"
    local timeout="${3:-90}"
    local job_var_name="$4"

    echo ""
    echo "POST /api/projects/{id}/stages/${stage_key}/run"
    echo "-------------------------------------------------"

    local run_response
    run_response=$(do_request "POST" "/api/projects/${PROJECT_ID}/stages/${stage_key}/run" "{}")
    local run_status
    run_status=$(do_request_status "POST" "/api/projects/${PROJECT_ID}/stages/${stage_key}/run")

    if echo "$run_status" | grep -qE '^HTTP/.* (200|201)'; then
        echo "  ✅ Status: 200/201 OK"
    else
        echo "  ❌ FAIL: Expected 200/201, got: $run_status"
        echo "  Response: $run_response"
        FAILED=1
        return 1
    fi

    local job_id
    job_id=$(echo "$run_response" | grep -oE '"jobId"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
    local job_status
    job_status=$(echo "$run_response" | grep -oE '"status"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)

    if [ -n "$job_id" ]; then
        echo "  ✅ Job ID: $job_id"
        echo "  ℹ️  Initial status: $job_status"
        
        case "$job_var_name" in
            naming) JOB_ID_NAMING="$job_id" ;;
            voice) JOB_ID_VOICE="$job_id" ;;
            visual) JOB_ID_VISUAL="$job_id" ;;
        esac
        
        if [ "$job_status" = "DONE" ]; then
            echo "  ✅ Job already completed: DONE"
            return 0
        fi
        
        echo ""
        echo "Poll /api/jobs/{jobId} (${stage_name})"
        echo "--------------------------------------"
        poll_job "$job_id" "$stage_name" "$timeout"
    else
        echo "  ❌ FAIL: No jobId in response"
        echo "  Response: $run_response"
        FAILED=1
        return 1
    fi
}

# =============================================================================
# DETERMINE AUTH MODE
# =============================================================================

echo "🔐 Determining auth mode..."

# Check for E2E_TEST_SECRET (CI mode)
if [ -n "${E2E_TEST_SECRET:-}" ]; then
    echo "  ℹ️  E2E_TEST_SECRET found, using CI token mode"
    AUTH_MODE="token"
    
# Check for CLERK_COOKIE (cookie mode)
elif [ -n "${CLERK_COOKIE:-}" ]; then
    echo "  ℹ️  CLERK_COOKIE found, using cookie mode"
    AUTH_MODE="cookie"
    
# Prompt for cookie
else
    echo "  ℹ️  No E2E_TEST_SECRET or CLERK_COOKIE found"
    echo ""
    echo "🔐 Enter Clerk session cookie (paste and press Enter):"
    echo "   Format: __session=eyJ..."
    read -rs COOKIE_INPUT
    echo "   (input received, not echoed for security)"
    if [ -n "$COOKIE_INPUT" ]; then
        AUTH_MODE="cookie"
        CLERK_COOKIE="$COOKIE_INPUT"
    else
        echo "❌ No auth credentials provided"
        exit 1
    fi
fi

echo ""
echo "🧪 Authenticated E2E Verification (Full Pipeline)"
echo "=================================================="
echo "   Mode: ${AUTH_MODE}"
echo "   Stages: Naming → Voice → Visual"
echo ""

# =============================================================================
# STEP 0: CHECK SERVER
# =============================================================================

echo "Step 0: Check server"
echo "--------------------"
if ! curl -s --connect-timeout 2 "${BASE_URL}" > /dev/null 2>&1; then
    echo "  ❌ Server not running at ${BASE_URL}"
    echo "  Run 'npm run dev' first"
    exit 1
fi
echo "  ✅ Server is running"

# =============================================================================
# SETUP AUTH
# =============================================================================

if [ "$AUTH_MODE" = "token" ]; then
    echo ""
    echo "Step 0.5: Get E2E auth token"
    echo "----------------------------"
    TOKEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/test/auth-token" \
        -H "x-e2e-secret: ${E2E_TEST_SECRET}" \
        2>&1)
    
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -oE '"token"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo "  ❌ Failed to get auth token"
        echo "  Response: $TOKEN_RESPONSE"
        exit 1
    fi
    
    AUTH_HEADER="Authorization: Bearer ${TOKEN}"
    echo "  ✅ Token received (not printed for security)"
    
elif [ "$AUTH_MODE" = "cookie" ]; then
    # Ensure cookie format
    if [[ "$CLERK_COOKIE" != *"="* ]]; then
        CLERK_COOKIE="__session=$CLERK_COOKIE"
    fi
    AUTH_HEADER="Cookie: ${CLERK_COOKIE}"
fi

# =============================================================================
# STEP 1: GET PROJECTS
# =============================================================================

echo ""
echo "Step 1: GET /api/projects"
echo "-------------------------"

PROJECTS_RESPONSE=$(do_request "GET" "/api/projects")
PROJECTS_STATUS=$(do_request_status "GET" "/api/projects")

if echo "$PROJECTS_STATUS" | grep -qE '^HTTP/.* 401'; then
    echo "  ❌ FAIL: Got 401 - auth invalid or expired"
    if [ "$AUTH_MODE" = "cookie" ]; then
        echo "  Please get a fresh cookie from browser DevTools"
    else
        echo "  Check E2E_TEST_SECRET configuration"
    fi
    exit 1
fi

if echo "$PROJECTS_STATUS" | grep -qE '^HTTP/.* 200'; then
    echo "  ✅ Status: 200 OK (auth working!)"
else
    echo "  ❌ FAIL: Expected 200, got: $PROJECTS_STATUS"
    FAILED=1
fi

# =============================================================================
# STEP 2: GET OR CREATE PROJECT
# =============================================================================

echo ""
echo "Step 2: Get or create project"
echo "-----------------------------"

if echo "$PROJECTS_RESPONSE" | grep -q '"id"'; then
    PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)
fi

if [ -n "$PROJECT_ID" ]; then
    echo "  ✅ Using existing project: $PROJECT_ID"
else
    echo "  📦 Creating new project..."
    CREATE_RESPONSE=$(do_request "POST" "/api/projects" '{"name":"E2E Test Project","description":"Created by verify-e2e-auth.sh"}')
    
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
# STAGES: NAMING → VOICE → VISUAL
# =============================================================================

echo ""
echo "═══════════════════════════════════════"
echo "  STAGE 1: NAMING"
echo "═══════════════════════════════════════"
run_stage "naming" "Naming" 60 "naming"
if [ $FAILED -eq 0 ]; then
    validate_output "naming" "Naming"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  STAGE 2: VOICE"
echo "═══════════════════════════════════════"
run_stage "voice" "Voice" 90 "voice"
if [ $FAILED -eq 0 ]; then
    validate_output "voice" "Voice"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  STAGE 3: VISUAL IDENTITY"
echo "═══════════════════════════════════════"
run_stage "visual_identity" "Visual Identity" 120 "visual"
if [ $FAILED -eq 0 ]; then
    validate_output "visual_identity" "Visual Identity"
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "=================================================="
if [ $FAILED -eq 0 ]; then
    echo "✅ All authenticated E2E tests passed!"
    echo ""
    echo "Summary:"
    echo "  Mode: ${AUTH_MODE}"
    echo "  Project: $PROJECT_ID"
    echo "  ├─ Naming:   ${JOB_ID_NAMING:-skipped}"
    echo "  ├─ Voice:    ${JOB_ID_VOICE:-skipped}"
    echo "  └─ Visual:   ${JOB_ID_VISUAL:-skipped}"
    exit 0
else
    echo "❌ Some tests failed"
    echo ""
    echo "Summary:"
    echo "  Mode: ${AUTH_MODE}"
    echo "  Project: $PROJECT_ID"
    echo "  ├─ Naming:   ${JOB_ID_NAMING:-failed}"
    echo "  ├─ Voice:    ${JOB_ID_VOICE:-failed}"
    echo "  └─ Visual:   ${JOB_ID_VISUAL:-failed}"
    exit 1
fi
