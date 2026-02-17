#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Genflow Ad Studio — System Test
# ─────────────────────────────────────────────────
# Tests backend API, frontend, proxies, and static assets.
# Starts servers if not already running, runs tests, then stops if it started them.
#
# Usage:
#   ./scripts/test_system.sh              # Full test (auto-starts servers)
#   ./scripts/test_system.sh --no-start   # Test against already-running servers
# ─────────────────────────────────────────────────

set -euo pipefail

BACKEND_PORT=8000
FRONTEND_PORT=3000
BACKEND_URL="http://localhost:${BACKEND_PORT}"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0
STARTED_SERVERS=false

# ─── Helpers ─────────────────────────────────────

pass() { PASSED=$((PASSED + 1)); echo -e "  ${GREEN}✓${NC} $1"; }
fail() { FAILED=$((FAILED + 1)); echo -e "  ${RED}✗${NC} $1"; }
warn() { WARNINGS=$((WARNINGS + 1)); echo -e "  ${YELLOW}!${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }

check_http() {
    local url="$1"
    local label="$2"
    local expected_code="${3:-200}"
    local actual_code
    actual_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if [ "$actual_code" = "$expected_code" ]; then
        pass "$label (HTTP $actual_code)"
    else
        fail "$label (expected $expected_code, got $actual_code)"
    fi
}

check_json() {
    local url="$1"
    local label="$2"
    local jq_check="${3:-.}"
    local response
    response=$(curl -sf "$url" 2>/dev/null) || { fail "$label (no response)"; return; }
    echo "$response" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null \
        && pass "$label" \
        || fail "$label (invalid JSON)"
}

check_json_field() {
    local url="$1"
    local label="$2"
    local field="$3"
    local expected="$4"
    local actual
    actual=$(curl -sf "$url" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('$field',''))" 2>/dev/null) || { fail "$label (no response)"; return; }
    if [ "$actual" = "$expected" ]; then
        pass "$label ($field=$actual)"
    else
        fail "$label (expected $field=$expected, got $actual)"
    fi
}

wait_for_port() {
    local port="$1"
    local label="$2"
    local max_wait=30
    local waited=0
    while ! lsof -i:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
        sleep 1
        waited=$((waited + 1))
        if [ "$waited" -ge "$max_wait" ]; then
            fail "$label did not start within ${max_wait}s"
            return 1
        fi
    done
    return 0
}

cleanup() {
    if [ "$STARTED_SERVERS" = true ]; then
        echo ""
        info "Stopping servers..."
        lsof -ti:${BACKEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
        lsof -ti:${FRONTEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
    fi
}
trap cleanup EXIT

# ─── Parse args ──────────────────────────────────

NO_START=false
for arg in "$@"; do
    case "$arg" in
        --no-start) NO_START=true ;;
    esac
done

# ─── Server startup ─────────────────────────────

echo ""
echo -e "${CYAN}Genflow Ad Studio — System Test${NC}"
echo "════════════════════════════════════════"

if [ "$NO_START" = false ]; then
    # Check if servers already running
    BACKEND_UP=false
    FRONTEND_UP=false
    lsof -i:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 && BACKEND_UP=true
    lsof -i:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 && FRONTEND_UP=true

    if [ "$BACKEND_UP" = true ] && [ "$FRONTEND_UP" = true ]; then
        info "Servers already running"
    else
        info "Starting servers..."
        make dev >/dev/null 2>&1 &
        STARTED_SERVERS=true

        wait_for_port "$BACKEND_PORT" "Backend" || exit 1
        wait_for_port "$FRONTEND_PORT" "Frontend" || exit 1
        info "Servers ready"
    fi
else
    # Verify servers are running
    lsof -i:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || { fail "Backend not running on port $BACKEND_PORT"; exit 1; }
    lsof -i:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || { fail "Frontend not running on port $FRONTEND_PORT"; exit 1; }
    info "Using existing servers"
fi

echo ""

# ─── 1. Backend Health ───────────────────────────

echo "Backend API"
echo "────────────────────────────────"
check_json_field "$BACKEND_URL/api/v1/health" "Health endpoint" "status" "ok"
check_http "$BACKEND_URL/docs" "Swagger docs"

# ─── 2. Backend API Endpoints ────────────────────

echo ""
echo "API Endpoints (GET)"
echo "────────────────────────────────"
check_json "$BACKEND_URL/api/v1/jobs" "List jobs"
check_json "$BACKEND_URL/api/v1/review/queue" "Review queue"

# Test single job endpoint (get first job ID if any)
FIRST_JOB=$(curl -sf "$BACKEND_URL/api/v1/jobs" 2>/dev/null | python3 -c "
import json,sys
jobs=json.load(sys.stdin)
print(jobs[0]['job_id'] if jobs else '')
" 2>/dev/null || echo "")

if [ -n "$FIRST_JOB" ]; then
    check_json "$BACKEND_URL/api/v1/jobs/$FIRST_JOB" "Get job ($FIRST_JOB)"
    check_json "$BACKEND_URL/api/v1/assets/$FIRST_JOB" "Job assets ($FIRST_JOB)"
else
    warn "No jobs in DB — skipping single-job tests"
fi

# ─── 3. Backend POST endpoints (validation) ──────

echo ""
echo "API Endpoints (POST validation)"
echo "────────────────────────────────"

# Test that POST endpoints exist and return proper validation errors (not 404)
for endpoint in "/pipeline/script" "/pipeline/avatar" "/pipeline/storyboard" "/pipeline/video" "/pipeline/stitch"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{}' \
        "$BACKEND_URL/api/v1$endpoint" 2>/dev/null)
    if [ "$code" = "422" ]; then
        pass "POST $endpoint (422 = validation error as expected)"
    elif [ "$code" = "404" ]; then
        fail "POST $endpoint not found (404)"
    elif [ "$code" = "000" ]; then
        fail "POST $endpoint no response"
    else
        pass "POST $endpoint (HTTP $code)"
    fi
done

# ─── 4. Static File Serving ──────────────────────

echo ""
echo "Static Files"
echo "────────────────────────────────"
# Check a known sample file (directory listing may not be enabled)
check_http "$BACKEND_URL/output/samples/smartwatch.png" "Sample product image"

# Check architecture diagrams
DIAGRAM_COUNT=0
for diagram in pipeline-flow system-architecture product-input script-generation avatar-creation storyboard-qc video-continuity ffmpeg-stitching review-approval; do
    code=$(curl -sf -o /dev/null -w "%{http_code}" "$BACKEND_URL/asset/$diagram.webp" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        DIAGRAM_COUNT=$((DIAGRAM_COUNT + 1))
    fi
done
if [ "$DIAGRAM_COUNT" -eq 9 ]; then
    pass "All 9 architecture diagrams served via /asset/"
else
    fail "Only $DIAGRAM_COUNT/9 diagrams accessible via /asset/"
fi

check_http "$BACKEND_URL/asset/bulk-marketing-workflow.png" "Workflow diagram PNG"

# ─── 5. Frontend ─────────────────────────────────

echo ""
echo "Frontend"
echo "────────────────────────────────"

# Check main page serves HTML
FRONTEND_HTML=$(curl -sf "$FRONTEND_URL" 2>/dev/null | head -1)
if echo "$FRONTEND_HTML" | grep -q "<!doctype html>"; then
    pass "Frontend serves HTML"
else
    fail "Frontend did not return HTML"
fi

# Check Vite proxies
check_http "$FRONTEND_URL/api/v1/health" "Vite proxy /api → backend"
check_http "$FRONTEND_URL/asset/pipeline-flow.webp" "Vite proxy /asset → backend"

# Check a sample image through output proxy
SAMPLE_EXISTS=$(curl -sf -o /dev/null -w "%{http_code}" "$FRONTEND_URL/output/samples/smartwatch.png" 2>/dev/null || echo "000")
if [ "$SAMPLE_EXISTS" = "200" ]; then
    pass "Vite proxy /output → backend"
else
    warn "Vite proxy /output (sample may not exist)"
fi

# ─── 6. GCloud Auth ──────────────────────────────

echo ""
echo "GCloud Authentication"
echo "────────────────────────────────"

if gcloud auth application-default print-access-token >/dev/null 2>&1; then
    pass "Application default credentials configured"
else
    fail "No application default credentials — run: gcloud auth application-default login"
fi

PROJECT=$(grep '^PROJECT_ID=' .env 2>/dev/null | cut -d= -f2)
if [ -n "$PROJECT" ]; then
    pass "PROJECT_ID set in .env ($PROJECT)"
else
    fail "PROJECT_ID not set in .env"
fi

BUCKET=$(grep '^GCS_BUCKET_NAME=' .env 2>/dev/null | cut -d= -f2)
if [ -n "$BUCKET" ]; then
    if gcloud storage buckets describe "gs://$BUCKET" --project="$PROJECT" >/dev/null 2>&1; then
        pass "GCS bucket gs://$BUCKET exists"
    else
        warn "GCS bucket gs://$BUCKET not found (run: make setup-gcs)"
    fi
else
    fail "GCS_BUCKET_NAME not set in .env"
fi

# ─── Summary ─────────────────────────────────────

echo ""
echo "════════════════════════════════════════"
TOTAL=$((PASSED + FAILED))
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}All $TOTAL tests passed${NC} ($WARNINGS warnings)"
    exit 0
else
    echo -e "${RED}$FAILED/$TOTAL tests failed${NC} ($WARNINGS warnings)"
    exit 1
fi
