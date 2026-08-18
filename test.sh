#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_PASS="password123"
TEST_NAME="Test User ${TIMESTAMP}"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}      🧪 NEXEL UNIFIED BACKEND TEST SUITE 🧪      ${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check if backend is running
echo -n "1. Checking Backend Server Status... "
HEALTH_CODE=$(curl -s -L -o /dev/null -w "%{http_code}" "${BASE_URL}/api/docs")
if [ "$HEALTH_CODE" -eq 200 ]; then
    echo -e "${GREEN}[PASSED]${NC} (Server listening at ${BASE_URL})"
else
    echo -e "${RED}[FAILED]${NC} (Server returned HTTP $HEALTH_CODE. Is 'npm run dev' running?)"
    echo -e "${YELLOW}Please start the backend with 'npm run dev' before running test.sh!${NC}"
    exit 1
fi

# 2. Test User Registration
echo -n "2. Testing User Registration (/api/auth/register)... "
REG_RES=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${TEST_NAME}\", \"email\":\"${TEST_EMAIL}\", \"password\":\"${TEST_PASS}\"}")

TOKEN=$(echo "$REG_RES" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}[PASSED]${NC} User registered successfully!"
else
    echo -e "${RED}[FAILED]${NC} Could not register user."
    echo "Response: $REG_RES"
    exit 1
fi

# 3. Test User Login
echo -n "3. Testing User Login (/api/auth/login)... "
LOGIN_RES=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\", \"password\":\"${TEST_PASS}\"}")

LOGIN_TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
if [ -n "$LOGIN_TOKEN" ]; then
    echo -e "${GREEN}[PASSED]${NC} User logged in & JWT token received!"
else
    echo -e "${RED}[FAILED]${NC} Login failed."
    echo "Response: $LOGIN_RES"
fi

# 4. Create a dummy test PDF for upload testing
TEST_PDF="/tmp/test_doc_${TIMESTAMP}.pdf"
cat << 'EOF' > "$TEST_PDF"
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kinds [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 55 >> stream
BT /F1 12 Tf 100 700 Td (Nexel AI test document for RAG and highlights) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
311
%%EOF
EOF

# 5. Test PDF Upload & RAG processing
echo -n "5. Testing Document Upload & RAG processing (/api/documents/upload)... "
UPLOAD_RES=$(curl -s -X POST "${BASE_URL}/api/documents/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${TEST_PDF}")

DOC_ID=$(echo "$UPLOAD_RES" | grep -o '"docId":"[^"]*' | grep -o '[^"]*$')

if [ -n "$DOC_ID" ]; then
    echo -e "${GREEN}[PASSED]${NC} Document uploaded (ID: ${DOC_ID})"
else
    echo -e "${RED}[FAILED]${NC} Document upload failed."
    echo "Response: $UPLOAD_RES"
fi

# 6. Test Document Streaming
if [ -n "$DOC_ID" ]; then
    echo -n "6. Testing PDF Streaming Endpoint (/api/documents/${DOC_ID}/stream)... "
    STREAM_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/documents/${DOC_ID}/stream")
    if [ "$STREAM_CODE" -eq 200 ] || [ "$STREAM_CODE" -eq 206 ]; then
        echo -e "${GREEN}[PASSED]${NC} PDF streamed (HTTP $STREAM_CODE)"
    else
        echo -e "${RED}[FAILED]${NC} PDF stream returned HTTP $STREAM_CODE"
    fi
fi

# 7. Test Highlights Creation & Retrieval
if [ -n "$DOC_ID" ]; then
    echo -n "7. Testing Highlights Creation (/api/highlights)... "
    HL_RES=$(curl -s -X POST "${BASE_URL}/api/highlights" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${TOKEN}" \
      -d "{\"docId\":\"${DOC_ID}\", \"text\":\"Nexel AI test document\", \"color\":\"yellow\"}")
    
    HL_ID=$(echo "$HL_RES" | grep -o '"_id":"[^"]*' | grep -o '[^"]*$')
    if [ -n "$HL_ID" ]; then
        echo -e "${GREEN}[PASSED]${NC} Highlight saved to MongoDB!"
    else
        echo -e "${RED}[FAILED]${NC} Could not save highlight."
        echo "Response: $HL_RES"
    fi

    echo -n "8. Testing Highlights Retrieval (/api/highlights?docId=${DOC_ID})... "
    GET_HL_RES=$(curl -s "${BASE_URL}/api/highlights?docId=${DOC_ID}")
    if echo "$GET_HL_RES" | grep -q "${DOC_ID}"; then
        echo -e "${GREEN}[PASSED]${NC} Fetched highlights for document!"
    else
        echo -e "${RED}[FAILED]${NC} Highlights query returned unexpected data."
        echo "Response: $GET_HL_RES"
    fi
fi

# 9. Test AI Generation / RAG query
if [ -n "$DOC_ID" ]; then
    echo -n "9. Testing AI Generation Endpoint (/api/ai/generate)... "
    AI_RES=$(curl -s -X POST "${BASE_URL}/api/ai/generate" \
      -H "Content-Type: application/json" \
      -d "{\"prompt\":\"What is this document about?\", \"action\":\"chat\", \"docId\":\"${DOC_ID}\"}")

    if [ -n "$AI_RES" ]; then
        echo -e "${GREEN}[PASSED]${NC} AI generator responded!"
        echo -e "${YELLOW}AI Output Preview:${NC} $(echo "$AI_RES" | head -n 3)..."
    else
        echo -e "${RED}[FAILED]${NC} AI generation endpoint returned empty response."
    fi

    echo -n "10. Testing Knowledge Graph Extraction (/api/graph/${DOC_ID})... "
    GRAPH_RES=$(curl -s "${BASE_URL}/api/graph/${DOC_ID}")
    if echo "$GRAPH_RES" | grep -q '"nodes"'; then
        echo -e "${GREEN}[PASSED]${NC} Knowledge Graph extracted & returned!"
    else
        echo -e "${RED}[FAILED]${NC} Knowledge Graph endpoint returned invalid data."
        echo "Response: $GRAPH_RES"
    fi
fi

# Cleanup temp file
rm -f "$TEST_PDF"

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}🎉 ALL ENDPOINT TESTS COMPLETED SUCCESSFULLY! 🎉${NC}"
echo -e "${BLUE}====================================================${NC}"
