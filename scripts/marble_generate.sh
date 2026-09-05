#!/usr/bin/env bash
# Generate a Marble world from a text prompt and download the .spz + collider.
# Usage: scripts/marble_generate.sh castle "Hogwarts-style castle on a lake at dusk"
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; PROMPT="${2:?prompt}"
KEY="$(grep -E '^worldlabs-api-key=' .env | cut -d= -f2- | tr -d '"'"'"' \r')"
API="https://api.worldlabs.ai/marble/v1"

echo "[$(date +%H:%M:%S)] start: $PROMPT"
OP=$(curl -sS -X POST "$API/worlds:generate" -H "Content-Type: application/json" -H "WLT-Api-Key: $KEY" \
  -d "$(printf '{"display_name":"%s","model":"marble-1.1","world_prompt":{"type":"text","text_prompt":"%s"}}' "$NAME" "$PROMPT")")
echo "$OP" | head -c 600; echo
OPID=$(echo "$OP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("operation_id") or d.get("name","").split("/")[-1])')
[ -n "$OPID" ] || { echo "no operation id"; exit 1; }
echo "operation: $OPID"
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
resp = d.get("response", d)
if "error" in d: print("ERROR", d["error"]); sys.exit(1)
assets = resp.get("assets", {})
spz = assets.get("splats", {}).get("spz_urls", {})
url = spz.get("full_res") or spz.get("500k") or next(iter(spz.values()), None)
print("spz url:", url)
urllib.request.urlretrieve(url, f"public/worlds/{name}.spz")
mesh = assets.get("mesh", {}).get("collider_mesh_url")
if mesh:
    urllib.request.urlretrieve(mesh, f"public/worlds/{name}-collider.glb"); print("collider saved")
print("saved public/worlds/%s.spz" % name)
PY
