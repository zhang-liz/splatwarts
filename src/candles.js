import * as THREE from "three";

// Floating candles for the Great Hall: instanced candle bodies with a flame sprite
// each, drifting and bobbing above the tables. Sized from the world radius R and the
// floor height so they hang above head height.
export class Candles {
  constructor(parent, R, floor, eye, count = 90) {
    this.group = new THREE.Group(); parent.add(this.group);
    this.n = count; this.t = 0;
    const head = eye - floor; // one person tall
    const h = head * 0.18, r = head * 0.014;
    const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r * 1.1, h, 8), new THREE.MeshStandardMaterial({ color: 0xf3e6c4, roughness: 0.8, emissive: 0x40301a }), count);
    const flame = new THREE.InstancedMesh(new THREE.PlaneGeometry(r * 7, r * 9), new THREE.MeshBasicMaterial({ map: flameTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), count);
    flame.renderOrder = 2;
    this.body = body; this.flame = flame; this.h = h;
    this.group.add(body, flame);
    this.items = [];
    for (let i = 0; i < count; i++) {
      // spread down the hall (z), over the two long tables (x), between 1.6 and 2.6 heads up
      const x = (Math.random() < 0.5 ? -1 : 1) * (0.06 + Math.random() * 0.14) * R + (Math.random() - 0.5) * 0.04 * R;
      const z = (Math.random() - 0.65) * 0.9 * R;
      const y = floor + head * (1.6 + Math.random());
      this.items.push({ x, y, z, phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.6, drift: (Math.random() - 0.5) * 0.02 * R });
    }
    this.light = new THREE.PointLight(0xffb347, 0.7, R * 0.8); this.light.position.set(0, eye + head * 0.8, -R * 0.2); this.group.add(this.light);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(1, 1, 1); this.p = new THREE.Vector3();
    this.update(0, null);
  }
  update(dt, camera) {
    this.t += dt;
    const cq = camera ? camera.getWorldQuaternion(this.q.clone()) : this.q;
    for (let i = 0; i < this.n; i++) {
      const c = this.items[i];
      const bob = Math.sin(this.t * c.speed + c.phase) * this.h * 0.35;
      this.p.set(c.x + Math.sin(this.t * 0.3 + c.phase) * c.drift, c.y + bob, c.z);
      this.m.compose(this.p, this.q.identity(), this.s); this.body.setMatrixAt(i, this.m);
      const flick = 0.85 + 0.15 * Math.sin(this.t * 11 * c.speed + c.phase * 3);
      this.p.y += this.h * 0.62;
      this.m.compose(this.p, cq, this.s.set(flick, flick, 1)); this.flame.setMatrixAt(i, this.m);
      this.s.set(1, 1, 1);
    }
    this.body.instanceMatrix.needsUpdate = true; this.flame.instanceMatrix.needsUpdate = true;
    this.light.intensity = 0.6 + 0.15 * Math.sin(this.t * 7.3) * Math.sin(this.t * 3.1);
  }
  dispose() { this.group.parent?.remove(this.group); }
}

function flameTexture() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 96;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 60, 2, 32, 52, 34);
  grad.addColorStop(0, "rgba(255,255,230,1)"); grad.addColorStop(0.25, "rgba(255,210,110,0.9)"); grad.addColorStop(0.6, "rgba(255,120,30,0.35)"); grad.addColorStop(1, "rgba(255,80,0,0)");
  g.fillStyle = grad; g.beginPath(); g.ellipse(32, 52, 22, 40, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
