#!/usr/bin/env bash
# Marble 1.1 Plus world from a public image URL. Usage: scripts/marble_from_url.sh <name> <image url> "<text prompt>"
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; IMG_URL="${2:?image url}"; WORLD_PROMPT="${3:?prompt}"
KEY="$(grep -E '^worldlabs-api-key=' .env | cut -d= -f2-)"
API="https://api.worldlabs.ai/marble/v1"
mkdir -p public/worlds
echo "[$(date +%H:%M:%S)] marble plus: $NAME"
OP=$(curl -sS -X POST "$API/worlds:generate" -H "Content-Type: application/json" -H "WLT-Api-Key: $KEY" \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"display_name": sys.argv[1], "model": "marble-1.1-plus", "world_prompt": {"type": "image", "image_prompt": {"source": "uri", "uri": sys.argv[2]}, "text_prompt": sys.argv[3]}}))' "$NAME" "$IMG_URL" "$WORLD_PROMPT")")
echo "$OP" | head -c 300; echo
OPID=$(echo "$OP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["operation_id"])')
while true; do
  R=$(curl -sS "$API/operations/$OPID" -H "WLT-Api-Key: $KEY")
  DONE=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("done", False))')
  [ "$DONE" = "True" ] && break
  echo "[$(date +%H:%M:%S)] generating..."; sleep 20
done
echo "$R" > "public/worlds/$NAME.json"
python3 - "$NAME" <<'PY'
import json, sys, urllib.request
name = sys.argv[1]
d = json.load(open(f"public/worlds/{name}.json"))
if d.get("error"): print("ERROR", d["error"]); sys.exit(1)
a = d["response"]["assets"]
spz = a["splats"]["spz_urls"]
urllib.request.urlretrieve(spz.get("full_res") or spz["500k"], f"public/worlds/{name}.spz")
if a.get("mesh", {}).get("collider_mesh_url"): urllib.request.urlretrieve(a["mesh"]["collider_mesh_url"], f"public/worlds/{name}-collider.glb")
if a.get("imagery", {}).get("pano_url"): urllib.request.urlretrieve(a["imagery"]["pano_url"], f"public/worlds/{name}-pano.png")
print("saved", name)
PY
