#!/usr/bin/env bash
# Generate a 3D model with Tripo from text and save it as public/models/<name>.glb
# Usage: scripts/tripo_generate.sh broom "a wizard's flying broomstick, worn wood, straw bristles"
# Needs tripo-api-key=... in .env
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; PROMPT="${2:?prompt}"
KEY="$(grep -E '^tripo-api-key=' .env | cut -d= -f2- | tr -d '"'"'"' \r')"
API="https://openapi.tripo3d.ai/v3"
mkdir -p public/models
echo "[$(date +%H:%M:%S)] tripo start: $PROMPT"
R=$(curl -sS -X POST "$API/generation/text-to-model" -H "Content-Type: application/json" -H "Authorization: Bearer $KEY" \
  -d "$(printf '{"prompt":"%s","model":"v3.1-20260211","texture":true,"pbr":true}' "$PROMPT")")
echo "$R" | head -c 400; echo
TASK=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["task_id"])')
while true; do
  S=$(curl -sS "$API/tasks/$TASK" -H "Authorization: Bearer $KEY")
  STATUS=$(echo "$S" | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d["status"], d.get("progress",""))')
  echo "[$(date +%H:%M:%S)] $STATUS"
  case "$STATUS" in success*) break;; failed*|cancelled*|banned*|unknown*) echo "$S"; exit 1;; esac
  sleep 3
done
URL=$(echo "$S" | python3 -c 'import sys,json; o=json.load(sys.stdin)["data"]["output"]; print(o.get("pbr_model") or o.get("model_url") or o.get("model"))')
curl -sSL "$URL" -o "public/models/$NAME.glb"
ls -la "public/models/$NAME.glb"
