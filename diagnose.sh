#!/bin/bash

# Trend UI Diagnostics Script
# Checks common issues with API connectivity

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}"
echo "╔════════════════════════════════════════╗"
echo "║      Trend UI Diagnostics Tool        ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}\n"

# Load environment
if [ -f .env.local ]; then
    source .env.local
    echo -e "${GREEN}✓ Found .env.local${NC}"
else
    echo -e "${RED}✗ No .env.local file found${NC}"
    exit 1
fi

API_URL="${NEXT_PUBLIC_CRAWLER_API_BASE_URL}"
echo -e "${BOLD}API Base URL:${NC} ${API_URL}\n"

# Extract base URL for CORS check
BASE_URL=$(echo "$API_URL" | sed -E 's|(https?://[^/]+).*|\1|')

echo -e "${BOLD}Running diagnostics...${NC}\n"

# Test 1: Basic connectivity
echo -e "${BLUE}[1/4] Testing basic API connectivity...${NC}"
if curl -s -f "${API_URL}/trends?limit=1" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ API is reachable${NC}"
else
    echo -e "${RED}  ✗ Cannot reach API${NC}"
    echo -e "${YELLOW}  → Check if the crawler service is running${NC}"
    exit 1
fi

# Test 2: Check response format
echo -e "\n${BLUE}[2/4] Checking API response format...${NC}"
RESPONSE=$(curl -s "${API_URL}/trends?limit=1")
if echo "$RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ API returns array format${NC}"

    # Check fields
    if echo "$RESPONSE" | jq -e '.[0] | has("id") and has("title_original") and has("canonical_title")' > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Required fields present${NC}"
    else
        echo -e "${YELLOW}  ⚠ Some fields may be missing${NC}"
    fi
else
    echo -e "${RED}  ✗ Unexpected response format${NC}"
    echo -e "${YELLOW}  Response: ${RESPONSE:0:100}...${NC}"
fi

# Test 3: CORS headers check
echo -e "\n${BLUE}[3/4] Checking CORS configuration...${NC}"
CORS_HEADERS=$(curl -sI -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" "${API_URL}/trends?limit=1" | grep -i "access-control" || echo "")

if [ -z "$CORS_HEADERS" ]; then
    echo -e "${RED}  ✗ CORS headers NOT configured${NC}"
    echo -e "${YELLOW}  → This is likely why the UI shows no data!${NC}\n"

    echo -e "${BOLD}  Problem:${NC} Browser blocks cross-origin requests"
    echo -e "${BOLD}  Solution:${NC} Add CORS middleware to your crawler API\n"

    echo -e "  ${BOLD}For FastAPI, add this to your crawler API:${NC}"
    echo -e "  ${YELLOW}────────────────────────────────────────${NC}"
    echo -e "  from fastapi.middleware.cors import CORSMiddleware"
    echo ""
    echo -e "  app.add_middleware("
    echo -e "      CORSMiddleware,"
    echo -e "      allow_origins=[\"*\"],  # or [\"http://localhost:3000\"]"
    echo -e "      allow_credentials=True,"
    echo -e "      allow_methods=[\"*\"],"
    echo -e "      allow_headers=[\"*\"],"
    echo -e "  )"
    echo -e "  ${YELLOW}────────────────────────────────────────${NC}\n"

    CORS_ISSUE=1
else
    echo -e "${GREEN}  ✓ CORS headers found:${NC}"
    echo "$CORS_HEADERS" | while IFS= read -r line; do
        echo -e "    ${GREEN}$line${NC}"
    done
    CORS_ISSUE=0
fi

# Test 4: Check if UI is running
echo -e "\n${BLUE}[4/4] Checking if UI is running...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ UI is accessible at http://localhost:3000${NC}"
else
    echo -e "${YELLOW}  ⚠ UI not running on port 3000${NC}"
    echo -e "${YELLOW}  → Run 'npm run dev' to start the UI${NC}"
fi

# Summary
echo -e "\n${BOLD}═══════════════════════════════════════${NC}"
echo -e "${BOLD}Summary:${NC}\n"

if [ "${CORS_ISSUE:-0}" -eq 1 ]; then
    echo -e "${RED}✗ CORS is NOT configured - UI cannot fetch data${NC}"
    echo -e "\n${BOLD}Next steps:${NC}"
    echo -e "1. Add CORS middleware to your crawler API (see above)"
    echo -e "2. Restart the crawler service"
    echo -e "3. Refresh the UI in your browser\n"
    exit 1
else
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "\nIf you still don't see data, check the browser console (F12) for errors.\n"
fi
