#!/usr/bin/env bash
# Marble 1.1 Plus world from a local photo, cleaned up first by Seedream edit (remove tourists,
# restore the set as it looks on film). Usage: scripts/marble_from_edit.sh <name> <photo> "<edit prompt>" "<world prompt>"
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; PHOTO="${2:?photo}"; EDIT_PROMPT="${3:?edit prompt}"; WORLD_PROMPT="${4:?world prompt}"
FAL="$(grep -E '^fal-api-key=' .env | cut -d= -f2-)"; KEY="$(grep -E '^worldlabs-api-key=' .env | cut -d= -f2-)"
API="https://api.worldlabs.ai/marble/v1"; mkdir -p public/worlds
python3 - "$PHOTO" "$EDIT_PROMPT" > /tmp/edit-$NAME.json <<'PY'
import json, sys, base64, mimetypes
mime = mimetypes.guess_type(sys.argv[1])[0] or "image/jpeg"
b = base64.b64encode(open(sys.argv[1], "rb").read()).decode()
print(json.dumps({"prompt": sys.argv[2], "image_urls": [f"data:{mime};base64,{b}"], "image_size": {"width": 2560, "height": 1440}, "num_images": 1, "enable_safety_checker": False}))
PY
echo "[$(date +%H:%M:%S)] seedream edit: $NAME"
IMG=$(curl -sS -X POST "https://fal.run/fal-ai/bytedance/seedream/v4/edit" -H "Authorization: Key $FAL" -H "Content-Type: application/json" --data-binary "@/tmp/edit-$NAME.json")
IMG_URL=$(echo "$IMG" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["images"][0]["url"])' 2>/dev/null || { echo "$IMG" | head -c 500; exit 1; })
curl -sSL "$IMG_URL" -o "public/worlds/$NAME-ref.png"; echo "ref: public/worlds/$NAME-ref.png"
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
a = d["response"]["assets"]; spz = a["splats"]["spz_urls"]
urllib.request.urlretrieve(spz["full_res"], f"public/worlds/{name}.spz")
if spz.get("500k"): urllib.request.urlretrieve(spz["500k"], f"public/worlds/{name}-500k.spz")
if a.get("mesh", {}).get("collider_mesh_url"): urllib.request.urlretrieve(a["mesh"]["collider_mesh_url"], f"public/worlds/{name}-collider.glb")
if a.get("imagery", {}).get("pano_url"): urllib.request.urlretrieve(a["imagery"]["pano_url"], f"public/worlds/{name}-pano.png")
print("READY", name)
PY
