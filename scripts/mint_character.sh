#!/usr/bin/env bash
# Mint: generate a T-pose character, rig + animate it, download the files.
# Usage: scripts/mint_character.sh dumbledore "old wizard headmaster, long white beard, ..." [motion prompt]
# Needs mint-api-key=... in .env
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; PROMPT="${2:?prompt}"; MOTION="${3:-idle standing, breathing softly, occasionally looking around}"
KEY="$(grep -E '^mint-api-key=' .env | cut -d= -f2-)"
API="https://api.mint.gg/v1"
H=(-H "Authorization: Bearer $KEY" -H "Content-Type: application/json")
mkdir -p public/characters/mint
poll() { # poll <operation json> -> final operation json
  local id; id=$(echo "$1" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id") or d.get("operationId") or d.get("name",""))')
  [ -n "$id" ] || { echo "no operation id in: $1" >&2; exit 1; }
  while true; do
    local r; r=$(curl -sS "$API/operations/$id" "${H[@]}")
    local st; st=$(echo "$r" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("status") or d.get("state") or ("done" if d.get("done") else "?"))')
    echo "[$(date +%H:%M:%S)] $id $st" >&2
    case "$st" in succeeded|completed|done|success) echo "$r"; return;; failed|error|cancelled) echo "$r" >&2; exit 1;; esac
    sleep 10
  done
}
echo "[$(date +%H:%M:%S)] generate: $PROMPT"
OP=$(curl -sS -X POST "$API/models:generate" "${H[@]}" -d "$(python3 -c 'import json,sys; print(json.dumps({"prompt": sys.argv[1], "name": sys.argv[2], "riggingPose": "t_pose"}))' "$PROMPT" "$NAME")")
echo "$OP" | head -c 400; echo
DONE=$(poll "$OP"); echo "$DONE" > "public/characters/mint/$NAME-model-op.json"
MODEL=$(echo "$DONE" | python3 -c 'import sys,json; d=json.load(sys.stdin); r=d.get("resource") or d.get("result") or {}; print(r.get("id") or d.get("resourceId",""))')
echo "model: $MODEL"
echo "[$(date +%H:%M:%S)] animate: $MOTION"
AOP=$(curl -sS -X POST "$API/models/$MODEL:animate" "${H[@]}" -d "$(python3 -c 'import json,sys; print(json.dumps({"motionPrompt": sys.argv[1], "heightMeters": 1.75}))' "$MOTION")")
echo "$AOP" | head -c 400; echo
ADONE=$(poll "$AOP"); echo "$ADONE" > "public/characters/mint/$NAME-anim-op.json"
ANIM=$(echo "$ADONE" | python3 -c 'import sys,json; d=json.load(sys.stdin); r=d.get("resource") or d.get("result") or {}; print(r.get("id") or "")')
echo "animation: $ANIM"
curl -sS "$API/assets/model/$MODEL/artifact-manifest" "${H[@]}" > "public/characters/mint/$NAME-model-manifest.json"
[ -n "$ANIM" ] && curl -sS "$API/animations/$ANIM/artifact-manifest" "${H[@]}" > "public/characters/mint/$NAME-anim-manifest.json" || true
python3 - "$NAME" <<'PY'
import json, sys, urllib.request, os
name = sys.argv[1]
def walk(o, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if isinstance(v, str) and v.startswith("http") and (".glb" in v or "glb" in k.lower()): out.append((k, v))
            walk(v, out)
    elif isinstance(o, list):
        for v in o: walk(v, out)
for kind in ["anim", "model"]:
    p = f"public/characters/mint/{name}-{kind}-manifest.json"
    if not os.path.exists(p): continue
    urls = []; walk(json.load(open(p)), urls)
    print(kind, "glb urls:", [k for k, _ in urls])
    if urls:
        urllib.request.urlretrieve(urls[0][1], f"public/characters/{name}.glb")
        print("saved public/characters/%s.glb from %s (%s)" % (name, kind, urls[0][0])); break
PY
