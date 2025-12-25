#!/bin/bash
set -euo pipefail

# =============================================================================
# Authenticated E2E Verification Script
# =============================================================================
#
# Tests the full authenticated pipeline: Naming → Voice → Visual
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
# REQUIREMENTS:
#   - Dev server running (npm run dev)
#   - Worker running (npm run worker:start) - optional but recommended
#
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILED=0

# Job IDs for summary
JOB_ID_NAMING=""
JOB_ID_VOICE=""
JOB_ID_VISUAL=""
PROJECT_ID=""

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

poll_job() {
    local job_id="$1"
    local stage_name="$2"
    local max_attempts="${3:-90}"
    local attempt=0
    local final_status=""

    while [ $attempt -lt $max_attempts ]; do
        local job_poll
        job_poll=$(curl -s "${BASE_URL}/api/jobs/${job_id}" \
            -H "Accept: application/json" \
            -H "Cookie: ${COOKIE}" \
            2>&1)
        
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
    output_response=$(curl -s "${BASE_URL}/api/projects/${PROJECT_ID}/stages/${stage_key}/output" \
        -H "Accept: application/json" \
        -H "Cookie: ${COOKIE}" \
        2>&1)
    local output_status
    output_status=$(curl -sI "${BASE_URL}/api/projects/${PROJECT_ID}/stages/${stage_key}/output" \
        -H "Accept: application/json" \
        -H "Cookie: ${COOKIE}" \
        2>&1 | head -1)

    if echo "$output_status" | grep -qE '^HTTP/.* 200'; then
        echo "  ✅ Status: 200 OK"
    else
        echo "  ❌ FAIL: Expected 200, got: $output_status"
        FAILED=1
        return 1
    fi

    # Check for versions array
    if echo "$output_response" | grep -q '"versions"'; then
        # Check if versions is non-empty array
        if echo "$output_response" | grep -qE '"versions"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{'; then
            echo "  ✅ versions array is non-empty"
        else
            echo "  ⚠️  Warning: versions may be empty"
        fi
    else
        echo "  ❌ FAIL: No versions in response"
        FAILED=1
    fi

    # Check for latestVersion
    if echo "$output_response" | grep -q '"latestVersion"'; then
        echo "  ✅ Response contains latestVersion"
        
        # Check latestVersion.content exists and not null/empty
        if echo "$output_response" | grep -qE '"latestVersion"[[:space:]]*:[[:space:]]*\{[^}]*"content"[[:space:]]*:[[:space:]]*[^n]'; then
            echo "  ✅ latestVersion.content exists"
        elif echo "$output_response" | grep -qE '"content"[[:space:]]*:[[:space:]]*\{'; then
            echo "  ✅ latestVersion.content exists (object)"
        else
            echo "  ⚠️  Warning: latestVersion.content may be null"
        fi
        
        # Check version number if present
        if echo "$output_response" | grep -qE '"version"[[:space:]]*:[[:space:]]*[0-9]+'; then
            echo "  ✅ version number present"
        fi
        
        # Check createdAt if present
        if echo "$output_response" | grep -qE '"createdAt"[[:space:]]*:'; then
            echo "  ✅ createdAt present"
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
    run_response=$(curl -s -X POST "${BASE_URL}/api/projects/${PROJECT_ID}/stages/${stage_key}/run" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -H "Cookie: ${COOKIE}" \
        2>&1)
    local run_status
    run_status=$(curl -sI -X POST "${BASE_URL}/api/projects/${PROJECT_ID}/stages/${stage_key}/run" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -H "Cookie: ${COOKIE}" \
        2>&1 | head -1)

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
        
        # Store job ID in appropriate variable
        case "$job_var_name" in
            naming) JOB_ID_NAMING="$job_id" ;;
            voice) JOB_ID_VOICE="$job_id" ;;
            visual) JOB_ID_VISUAL="$job_id" ;;
        esac
        
        # If already DONE, skip polling
        if [ "$job_status" = "DONE" ]; then
            echo "  ✅ Job already completed: DONE"
            return 0
        fi
        
        # Poll for completion
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
# GET COOKIE
# =============================================================================

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
echo "🧪 Authenticated E2E Verification (Full Pipeline)"
echo "=================================================="
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
# STEP 1: GET PROJECTS
# =============================================================================

echo ""
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
# STEP 2: GET OR CREATE PROJECT
# =============================================================================

echo ""
echo "Step 2: Get or create project"
echo "-----------------------------"

# Try to parse projects array
if echo "$PROJECTS_RESPONSE" | grep -q '"id"'; then
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
# STEP 3-4: NAMING STAGE
# =============================================================================

echo ""
echo "═══════════════════════════════════════"
echo "  STAGE 1: NAMING"
echo "═══════════════════════════════════════"

run_stage "naming" "Naming" 60 "naming"
if [ $FAILED -eq 0 ]; then
    validate_output "naming" "Naming"
fi

# =============================================================================
# STEP 5-6: VOICE STAGE
# =============================================================================

echo ""
echo "═══════════════════════════════════════"
echo "  STAGE 2: VOICE"
echo "═══════════════════════════════════════"

run_stage "voice" "Voice" 90 "voice"
if [ $FAILED -eq 0 ]; then
    validate_output "voice" "Voice"
fi

# =============================================================================
# STEP 7-8: VISUAL IDENTITY STAGE
# =============================================================================

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
    echo "  Project: $PROJECT_ID"
    echo "  ├─ Naming:   ${JOB_ID_NAMING:-skipped}"
    echo "  ├─ Voice:    ${JOB_ID_VOICE:-skipped}"
    echo "  └─ Visual:   ${JOB_ID_VISUAL:-skipped}"
    exit 0
else
    echo "❌ Some tests failed"
    echo ""
    echo "Summary:"
    echo "  Project: $PROJECT_ID"
    echo "  ├─ Naming:   ${JOB_ID_NAMING:-failed}"
    echo "  ├─ Voice:    ${JOB_ID_VOICE:-failed}"
    echo "  └─ Visual:   ${JOB_ID_VISUAL:-failed}"
    exit 1
fi
