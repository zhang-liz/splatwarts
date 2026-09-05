import * as THREE from "three";

const RING_RADIUS = 2.5;
const TUBE = 0.18;

export class Rings {
  constructor(scene, course) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rings = course.map((c, i) => this.makeRing(c, i));
    this.next = 0;
    this.lastSide = null;
  }

  makeRing({ position, normal }, index) {
    const geo = new THREE.TorusGeometry(RING_RADIUS, TUBE, 16, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffc23a, emissive: 0xffa500, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(normal));
    // Number label sprite
    const label = makeLabel(String(index + 1));
    label.position.set(0, RING_RADIUS + 0.9, 0);
    mesh.add(label);
    this.group.add(mesh);
    return { mesh, position, normal, passed: false, label };
  }

  reset() {
    this.next = 0;
    this.lastSide = null;
    for (const r of this.rings) {
      r.passed = false;
      r.mesh.material.color.set(0xffc23a);
      r.mesh.material.emissive.set(0xffa500);
      r.mesh.material.emissiveIntensity = 0.6;
      r.mesh.visible = true;
      r.mesh.scale.setScalar(1);
    }
    this.highlight();
  }

  highlight() {
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (r.passed) continue;
      const active = i === this.next;
      r.mesh.material.emissiveIntensity = active ? 1.4 : 0.25;
      r.mesh.material.color.set(active ? 0xffe28a : 0x9a7a3a);
    }
  }

  // Returns true if the player passed the next ring this frame.
  update(playerPos, dt, time) {
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.passed) r.mesh.rotation.z += dt * 0.6 * (i === this.next ? 1 : 0.2);
      if (i === this.next) r.mesh.scale.setScalar(1 + Math.sin(time * 4) * 0.04);
    }
    const r = this.rings[this.next];
    if (!r) return false;
    const rel = playerPos.clone().sub(r.position);
    const side = Math.sign(rel.dot(r.normal));
    const lateral = rel.clone().addScaledVector(r.normal, -rel.dot(r.normal)).length();
    let passed = false;
    if (this.lastSide !== null && side !== this.lastSide && lateral < RING_RADIUS) {
      passed = true;
      r.passed = true;
      r.mesh.material.color.set(0x6cff8a);
      r.mesh.material.emissive.set(0x2bd45a);
      r.mesh.material.emissiveIntensity = 1.5;
      this.next++;
      this.lastSide = null;
      this.highlight();
    } else {
      this.lastSide = side;
    }
    return passed;
  }

  get total() { return this.rings.length; }
  get done() { return this.next >= this.rings.length; }
}

function makeLabel(text) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.font = "bold 84px Georgia";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 8; ctx.strokeStyle = "#000"; ctx.strokeText(text, 64, 64);
  ctx.fillStyle = "#fff"; ctx.fillText(text, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.setScalar(1.6);
  return sprite;
}
