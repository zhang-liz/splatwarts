#!/usr/bin/env bash
# Shrink a GLB for the web: simplify mesh, 1k webp textures, quantized attributes (three.js loads it natively).
# Usage: scripts/shrink_glb.sh in.glb out.glb [simplify_ratio]
set -euo pipefail
npx -y @gltf-transform/cli@4 optimize "$1" "$2" --compress quantize --simplify-ratio "${3:-0.12}" --simplify-error 0.01 --texture-size 1024 --texture-compress webp 2>&1 | tail -1
