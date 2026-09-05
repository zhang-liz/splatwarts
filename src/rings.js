import * as THREE from "three";



export class Rings {
  constructor(scene, course, ringRadius = 2.5) {
    this.scene = scene;
    this.R = ringRadius;
    this.tube = ringRadius * 0.07;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rings = course.map((c, i) => this.makeRing(c, i));
    this.next = 0;
    this.lastSide = null;
    this.bursts = [];
  }

  makeRing({ position, normal }, index) {
    const geo = new THREE.TorusGeometry(this.R, this.tube, 16, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffc23a, emissive: 0xffa500, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(normal));
    // Number label sprite
    const label = makeLabel(String(index + 1));
    label.position.set(0, this.R * 1.35, 0);
    label.scale.setScalar(this.R * 0.35);
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
    this.tickBursts(dt);
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
    if (this.lastSide !== null && side !== this.lastSide && lateral < this.R) {
      passed = true;
      r.passed = true;
      r.mesh.material.color.set(0x6cff8a);
      r.mesh.material.emissive.set(0x2bd45a);
      r.mesh.material.emissiveIntensity = 1.5;
      this.next++;
      this.lastSide = null;
      this.highlight();
      this.burst(r.position);
    } else {
      this.lastSide = side;
    }
    return passed;
  }

  burst(at) {
    const n = 60;
    const pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos.set([at.x, at.y, at.z], i * 3); vel.push(new THREE.Vector3().randomDirection().multiplyScalar(this.R * (0.6 + Math.random()))); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffe08a, size: this.R * 0.12, transparent: true, opacity: 1, depthWrite: false });
    const pts = new THREE.Points(geo, mat); pts.renderOrder = 2; this.group.add(pts);
    this.bursts.push({ pts, vel, life: 0 });
  }
  tickBursts(dt) {
    for (const b of this.bursts) {
      b.life += dt; const a = b.pts.geometry.attributes.position;
      for (let i = 0; i < b.vel.length; i++) { a.array[i * 3] += b.vel[i].x * dt; a.array[i * 3 + 1] += (b.vel[i].y - b.life * this.R * 0.8) * dt; a.array[i * 3 + 2] += b.vel[i].z * dt; }
      a.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / 0.9);
    }
    this.bursts = this.bursts.filter((b) => { if (b.life > 0.9) { this.group.remove(b.pts); b.pts.geometry.dispose(); return false; } return true; });
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
  sprite.renderOrder = 3;
    return sprite;
}
