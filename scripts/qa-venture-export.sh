#!/usr/bin/env bash
set -euo pipefail

TOKEN_PATH="/tmp/e2e-token.txt"

if [[ ! -f "$TOKEN_PATH" ]]; then
  echo "Missing token at $TOKEN_PATH" >&2
  exit 1
fi

TOKEN="$(cat "$TOKEN_PATH")"
if [[ -z "$TOKEN" ]]; then
  echo "Empty token in $TOKEN_PATH" >&2
  exit 1
fi

PROJECT_ID="$(node - <<'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.project.findFirst({ select: { id: true, name: true } })
  .then((p) => {
    if (!p) {
      console.log('no-project');
      return;
    }
    console.log(p.id);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
EOF
)"

if [[ "$PROJECT_ID" == "no-project" || -z "$PROJECT_ID" ]]; then
  echo "No project available for QA." >&2
  exit 1
fi

BASE_URL="http://127.0.0.1:3010"
AUTH_HEADER="Authorization: Bearer ${TOKEN}"

PDF_HEADERS="$(curl -s -I "${BASE_URL}/api/projects/${PROJECT_ID}/venture/export/pdf" -H "${AUTH_HEADER}")"
echo "$PDF_HEADERS"
echo "$PDF_HEADERS" | rg -q "200" || { echo "PDF status not 200" >&2; exit 1; }
echo "$PDF_HEADERS" | rg -qi "content-type: application/pdf" || { echo "PDF content-type missing" >&2; exit 1; }
echo "$PDF_HEADERS" | rg -qi "content-disposition: attachment; filename=\"venture-fundamentos-.*\\.pdf\"" || { echo "PDF content-disposition missing" >&2; exit 1; }

ZIP_HEADERS="$(curl -s -I "${BASE_URL}/api/projects/${PROJECT_ID}/venture/export/bundle" -H "${AUTH_HEADER}")"
echo "$ZIP_HEADERS"
echo "$ZIP_HEADERS" | rg -q "200" || { echo "ZIP status not 200" >&2; exit 1; }
echo "$ZIP_HEADERS" | rg -qi "content-type: application/zip" || { echo "ZIP content-type missing" >&2; exit 1; }
echo "$ZIP_HEADERS" | rg -qi "content-disposition: attachment; filename=\"venture-fundamentos-.*\\.zip\"" || { echo "ZIP content-disposition missing" >&2; exit 1; }

curl -s -o /tmp/fundamentos.pdf -H "${AUTH_HEADER}" "${BASE_URL}/api/projects/${PROJECT_ID}/venture/export/pdf"
head -c 4 /tmp/fundamentos.pdf
echo
head -c 4 /tmp/fundamentos.pdf | rg -q "%PDF" || { echo "PDF magic header missing" >&2; exit 1; }

curl -s -o /tmp/fundamentos.zip -H "${AUTH_HEADER}" "${BASE_URL}/api/projects/${PROJECT_ID}/venture/export/bundle"
unzip -l /tmp/fundamentos.zip
unzip -l /tmp/fundamentos.zip | rg -q "venture-fundamentos-.*\\.md" || { echo "ZIP missing MD" >&2; exit 1; }
unzip -l /tmp/fundamentos.zip | rg -q "venture-fundamentos-.*\\.pdf" || { echo "ZIP missing PDF" >&2; exit 1; }
unzip -l /tmp/fundamentos.zip | rg -q "README" || { echo "ZIP missing README" >&2; exit 1; }

unzip -p /tmp/fundamentos.zip "*.pdf" | head -c 4
echo
unzip -p /tmp/fundamentos.zip "*.pdf" | head -c 4 | rg -q "%PDF" || { echo "ZIP PDF magic header missing" >&2; exit 1; }

echo "QA venture export OK for project ${PROJECT_ID}"
