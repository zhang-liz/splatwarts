#!/usr/bin/env bash
# Static prop from a concept image via Tripo H3.1 on FAL. Usage: scripts/fal_model.sh broom public/characters/concepts/broom.png public/models/broom.glb
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; IMG="${2:?image}"; OUT="${3:?out path}"
FAL="$(grep -E '^fal-api-key=' .env | cut -d= -f2-)"
python3 - "$IMG" > /tmp/fal-$NAME-i2m.json <<'PY'
import json, sys, base64
b = base64.b64encode(open(sys.argv[1], "rb").read()).decode()
print(json.dumps({"image_url": "data:image/png;base64," + b, "texture": True, "pbr": True, "texture_quality": "detailed", "geometry_quality": "detailed", "orientation": "align_image"}))
PY
r=$(curl -sS -X POST "https://queue.fal.run/tripo3d/h3.1/image-to-3d" -H "Authorization: Key $FAL" -H "Content-Type: application/json" --data-binary "@/tmp/fal-$NAME-i2m.json")
status_url=$(echo "$r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["status_url"])'); resp_url=$(echo "$r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["response_url"])')
while true; do st=$(curl -sS "$status_url" -H "Authorization: Key $FAL" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status"))'); echo "[$(date +%H:%M:%S)] $NAME $st"; [ "$st" = "COMPLETED" ] && break; sleep 8; done
M=$(curl -sS "$resp_url" -H "Authorization: Key $FAL")
GLB=$(echo "$M" | python3 -c 'import sys,json; d=json.load(sys.stdin); m=d.get("model_mesh") or {}; print(m.get("url") or (d.get("model_urls") or {}).get("glb",""))')
mkdir -p "$(dirname "$OUT")"; curl -sSL "$GLB" -o "$OUT"; ls -la "$OUT"
