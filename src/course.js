import * as THREE from "three";

// A lap near the world center, where Marble splats are sharp. Rings sit on a
// circle of 20% of the radius, pushed slightly toward the view direction (-Z),
// heights rising and falling a little, each ring facing along the lap.
export function buildCourse(R, count = 10) {
  const r = R * 0.2;
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 2) * R * 0.05, Math.sin(a) * r - R * 0.08);
    const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).normalize();
    out.push({ position: p, normal: tangent });
  }
  return out;
}

// Spawn a bit behind ring 1, facing it.
export function spawnFor(course, R) {
  const first = course[0];
  const back = first.position.clone().addScaledVector(first.normal, -R * 0.12);
  const yaw = Math.atan2(-(first.position.x - back.x), -(first.position.z - back.z));
  return { position: [back.x, back.y, back.z], yaw, pitch: 0 };
}

// Hand-placed course goes here when ready. Return null to use the lap.
// Example: [[x,y,z], [x,y,z], ...]  (press P in game to print positions)
export const HAND_COURSE = null;
