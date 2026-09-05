import * as THREE from "three";

// Ring course. Positions are relative to the world spawn, in world units.
// Auto course: a gentle S curve ahead of spawn. Replace with hand-placed
// [x, y, z] triples once you know the world (press P to print positions).
export function buildCourse(spawn, count = 10, spacing = 14) {
  const out = [];
  const origin = new THREE.Vector3(...spawn.position);
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), spawn.yaw);
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  for (let i = 0; i < count; i++) {
    const t = i + 1;
    const p = origin.clone()
      .addScaledVector(forward, t * spacing)
      .addScaledVector(right, Math.sin(t * 0.7) * spacing * 0.6)
      .add(new THREE.Vector3(0, Math.sin(t * 0.5) * 3 + 1, 0));
    // Ring faces the previous point so you fly through it head-on.
    const prev = i === 0 ? origin : out[i - 1].position;
    const normal = p.clone().sub(prev).normalize();
    out.push({ position: p, normal });
  }
  return out;
}

// Hand-placed course goes here when ready. Return null to use the auto course.
// Example: [[x,y,z], [x,y,z], ...]
export const HAND_COURSE = null;
