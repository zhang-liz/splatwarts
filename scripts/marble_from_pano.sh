#!/usr/bin/env bash
# Expert path: a 2:1 equirectangular panorama in, a world with full 360 coverage out.
# Enhances an existing pano with Seedream edit at 4K first (detail, photoreal, layout kept).
# Usage: scripts/marble_from_pano.sh <name> <pano.png> "<world prompt>" [enhance=1]
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; PANO="${2:?pano}"; WORLD_PROMPT="${3:?world prompt}"; ENH="${4:-1}"
FAL="$(grep -E '^fal-api-key=' .env | cut -d= -f2-)"; KEY="$(grep -E '^worldlabs-api-key=' .env | cut -d= -f2-)"
API="https://api.worldlabs.ai/marble/v1"; mkdir -p public/worlds
if [ "$ENH" = "1" ]; then
python3 - "$PANO" > /tmp/pano-$NAME.json <<'PY'
import json, sys, base64, mimetypes
mime = mimetypes.guess_type(sys.argv[1])[0] or "image/png"
b = base64.b64encode(open(sys.argv[1], "rb").read()).decode()
p = ("This is a seamless equirectangular 360 panorama. Enhance it: much sharper fine detail, photoreal textures on stone, wood, fabric and glass, "
     "cleaner edges, richer but natural light, remove smears and blur. Keep the exact same layout, geometry, objects, colours and camera. "
     "Keep it a valid equirectangular panorama: 2:1, straight verticals, continuous left and right edges, full sky above and floor below. No text, no people.")
print(json.dumps({"prompt": p, "image_urls": [f"data:{mime};base64,{b}"], "image_size": {"width": 4096, "height": 2048}, "num_images": 1, "enable_safety_checker": False}))
PY
echo "[$(date +%H:%M:%S)] seedream enhance pano: $NAME"
IMG=$(curl -sS -X POST "https://fal.run/fal-ai/bytedance/seedream/v4/edit" -H "Authorization: Key $FAL" -H "Content-Type: application/json" --data-binary "@/tmp/pano-$NAME.json")
IMG_URL=$(echo "$IMG" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["images"][0]["url"])' 2>/dev/null || { echo "$IMG" | head -c 500; exit 1; })
curl -sSL "$IMG_URL" -o "public/worlds/$NAME-ref.png"; echo "ref: public/worlds/$NAME-ref.png"
else
IMG_URL=$(curl -sS -X POST "https://fal.run/fal-ai/upload" -H "Authorization: Key $FAL" -F "file=@$PANO" | python3 -c 'import sys,json; print(json.load(sys.stdin)["url"])' 2>/dev/null || true)
[ -n "$IMG_URL" ] || { echo "upload failed"; exit 1; }
fi
echo "[$(date +%H:%M:%S)] marble plus pano: $NAME"
OP=$(curl -sS -X POST "$API/worlds:generate" -H "Content-Type: application/json" -H "WLT-Api-Key: $KEY" \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"display_name": sys.argv[1], "model": "marble-1.1-plus", "world_prompt": {"type": "image", "image_prompt": {"source": "uri", "uri": sys.argv[2]}, "is_pano": True, "text_prompt": sys.argv[3]}}))' "$NAME" "$IMG_URL" "$WORLD_PROMPT")")
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
