#!/usr/bin/env bash
# Character from a concept image, all on FAL: Tripo H3.1 image-to-3D, then Meshy auto-rig + animation.
# Usage: scripts/fal_character.sh dumbledore public/characters/concepts/dumbledore.png [height_m] [animation_id]
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; IMG="${2:?image path}"; H="${3:-1.75}"; ANIM="${4:-92}"
FAL="$(grep -E '^fal-api-key=' .env | cut -d= -f2-)"
mkdir -p public/characters/raw
submit() { # endpoint bodyfile -> response json (queue submit, poll, fetch)
  local r; r=$(curl -sS -X POST "https://queue.fal.run/$1" -H "Authorization: Key $FAL" -H "Content-Type: application/json" --data-binary "@$2")
  local status_url resp_url; status_url=$(echo "$r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["status_url"])'); resp_url=$(echo "$r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["response_url"])')
  while true; do
    local st; st=$(curl -sS "$status_url" -H "Authorization: Key $FAL" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status"))')
    echo "[$(date +%H:%M:%S)] $1 $st" >&2
    [ "$st" = "COMPLETED" ] && break; sleep 8
  done
  curl -sS "$resp_url" -H "Authorization: Key $FAL"
}
python3 - "$IMG" > /tmp/fal-$NAME-i2m.json <<'PY'
import json, sys, base64
b = base64.b64encode(open(sys.argv[1], "rb").read()).decode()
print(json.dumps({"image_url": "data:image/png;base64," + b, "texture": True, "pbr": True, "texture_quality": "detailed", "geometry_quality": "detailed", "orientation": "align_image", "auto_size": True}))
PY
M=$(submit "tripo3d/h3.1/image-to-3d" /tmp/fal-$NAME-i2m.json); echo "$M" > "public/characters/raw/$NAME-model.json"
GLB=$(echo "$M" | python3 -c 'import sys,json; d=json.load(sys.stdin); m=d.get("model_mesh") or {}; print(m.get("url") or (d.get("model_urls") or {}).get("glb",""))')
echo "model glb: $GLB"; curl -sSL "$GLB" -o "public/characters/raw/$NAME-static.glb"
python3 -c "import json,sys; print(json.dumps({'model_url': sys.argv[1], 'enable_animation': True, 'animation_action_id': int(sys.argv[3]), 'height_meters': float(sys.argv[2]), 'enable_safety_checker': False}))" "$GLB" "$H" "$ANIM" > /tmp/fal-$NAME-rig.json
R=$(submit "fal-ai/meshy/rigging" /tmp/fal-$NAME-rig.json); echo "$R" > "public/characters/raw/$NAME-rig.json"
echo "$R" | python3 -c 'import sys,json; d=json.load(sys.stdin); print({k:(v.get("url") if isinstance(v,dict) else v) for k,v in d.items()})' | head -c 800; echo
A=$(echo "$R" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("animation_glb") or d.get("rigged_character_glb") or {}).get("url",""))')
curl -sSL "$A" -o "public/characters/$NAME.glb"; ls -la "public/characters/$NAME.glb"
