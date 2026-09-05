#!/usr/bin/env bash
# Meshy's pose estimation fails at random on robed characters; retry the rig job a few times.
# Usage: scripts/fal_rig_retry.sh name animation_id height_m [tries]
cd "$(dirname "$0")/.."
for i in $(seq 1 "${4:-4}"); do
  scripts/fal_rig.sh "$1" "$2" "$3" && [ -s "public/characters/$1-a$2.glb" ] && exit 0
  echo "retry $i failed for $1 anim $2"; sleep 5
done
exit 1
