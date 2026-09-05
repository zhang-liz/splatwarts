#!/usr/bin/env bash
# Re-rig an already generated Tripo character on Meshy (via FAL) with a chosen animation, then shrink it.
# Meshy animation ids: 0 = idle (default here). Reads the static model URL from public/characters/raw/<name>-model.json.
# Usage: scripts/fal_rig.sh dumbledore [animation_id] [height_m]
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; ANIM="${2:-0}"; H="${3:-1.75}"
FAL="$(grep -E '^fal-api-key=' .env | cut -d= -f2-)"
GLB=$(python3 -c 'import sys,json; d=json.load(open(sys.argv[1])); m=d.get("model_mesh") or {}; print(m.get("url") or (d.get("model_urls") or {}).get("glb",""))' "public/characters/raw/$NAME-model.json")
python3 -c "import json,sys; print(json.dumps({'model_url': sys.argv[1], 'enable_animation': True, 'animation_action_id': int(sys.argv[3]), 'height_meters': float(sys.argv[2]), 'enable_safety_checker': False}))" "$GLB" "$H" "$ANIM" > /tmp/fal-$NAME-rig$ANIM.json
r=$(curl -sS -X POST "https://queue.fal.run/fal-ai/meshy/rigging" -H "Authorization: Key $FAL" -H "Content-Type: application/json" --data-binary "@/tmp/fal-$NAME-rig$ANIM.json")
status_url=$(echo "$r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["status_url"])'); resp_url=$(echo "$r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["response_url"])')
while true; do
  st=$(curl -sS "$status_url" -H "Authorization: Key $FAL" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status"))')
  echo "[$(date +%H:%M:%S)] rig $NAME anim $ANIM $st"; [ "$st" = "COMPLETED" ] && break; sleep 10
done
R=$(curl -sS "$resp_url" -H "Authorization: Key $FAL"); echo "$R" > "public/characters/raw/$NAME-rig$ANIM.json"
A=$(echo "$R" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("animation_glb") or d.get("rigged_character_glb") or {}).get("url",""))')
curl -sSL "$A" -o "public/characters/raw/$NAME-anim$ANIM.glb"
OUT="${OUT:-public/characters/$NAME-a$ANIM.glb}"; scripts/shrink_glb.sh "public/characters/raw/$NAME-anim$ANIM.glb" "$OUT"
echo "READY $NAME $(stat -f%z "$OUT") bytes"
