import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Broom flight. Camera rides the broom. Mouse steers (pointer lock).
// W starts and speeds up, S slows, Shift boosts, Space brakes to a stop.
// Flight stays inside a sphere of radius `bounds` around the origin.
export class Broom {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.rig = new THREE.Group();      // position + yaw
    this.pitchNode = new THREE.Group(); // pitch + roll
    this.rig.add(this.pitchNode);
    this.pitchNode.add(camera);
    this.mesh = makePlaceholderBroom();
    this.pitchNode.add(this.mesh);

    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.speed = 0;
    this.cruise = 0;      // 0 until W is pressed, then base speed
    this.keys = new Set();
    this.locked = false;
    this.enabled = false; // pointer locked at least once
    this.ready = false;   // world loaded
    this.outside = false;
    this.setScale(20);

    window.addEventListener("keydown", (e) => { this.keys.add(e.code); if (e.code === "KeyW" || e.code === "ArrowUp") this.cruise = this.baseSpeed; });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
    canvas.addEventListener("click", () => canvas.requestPointerLock());
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) this.enabled = true;
    });
    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.2, 1.2);
    });
    this.loadModel("/models/broom.glb");
  }

  // Everything is sized from the flight radius so any world feels right.
  setScale(R) {
    this.bounds = R;
    this.baseSpeed = R * 0.12;
    this.maxSpeed = R * 0.28;
    this.boost = 1.6;
    const s = R / 20;
    this.camera.position.set(0, 0.6 * s, 1.6 * s);
    this.mesh.scale.setScalar(s);
    this.mesh.position.set(0, -0.35 * s, 0);
    this.s = s;
  }

  async loadModel(url) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (!r.ok || !(r.headers.get("content-type") || "").includes("model")) return;
      const gltf = await new GLTFLoader().loadAsync(url);
      const m = gltf.scene;
      // Tripo exports are ~1 unit tall, upright. Lay along -Z so the head points forward.
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      m.scale.setScalar(2.2 / longest);
      if (size.y === longest) m.rotation.x = -Math.PI / 2;
      else if (size.x === longest) m.rotation.y = Math.PI / 2;
      const wrap = new THREE.Group(); wrap.add(m);
      this.pitchNode.remove(this.mesh);
      this.mesh = wrap;
      this.pitchNode.add(wrap);
      this.setScale(this.bounds);
      console.log("Loaded broom model", url);
    } catch (e) { console.warn("No broom.glb, using placeholder", e); }
  }

  reset(spawn) {
    if (spawn) this.spawn = spawn;
    this.rig.position.set(...this.spawn.position);
    this.yaw = this.spawn.yaw; this.pitch = this.spawn.pitch; this.roll = 0;
    this.speed = 0; this.cruise = 0;
    this.apply();
  }

  apply() {
    this.rig.rotation.set(0, this.yaw, 0);
    this.pitchNode.rotation.set(this.pitch, 0, this.roll);
  }

  update(dt) {
    if (!this.enabled || !this.ready) { this.apply(); return; }
    const k = this.keys;
    let target = this.cruise;
    if (k.has("KeyW") || k.has("ArrowUp")) target = this.maxSpeed;
    if (k.has("KeyS") || k.has("ArrowDown")) target = this.baseSpeed * 0.4;
    if (k.has("Space")) { target = 0; this.cruise = 0; }
    if (k.has("ShiftLeft") || k.has("ShiftRight")) target *= this.boost;
    this.speed += (target - this.speed) * Math.min(1, dt * 2.5);
    if (k.has("KeyA") || k.has("ArrowLeft")) this.yaw += dt * 1.4;
    if (k.has("KeyD") || k.has("ArrowRight")) this.yaw -= dt * 1.4;
    const yawRate = (this.yaw - (this._prevYaw ?? this.yaw)) / Math.max(dt, 1e-3);
    this._prevYaw = this.yaw;
    const targetRoll = THREE.MathUtils.clamp(yawRate * 0.25, -0.7, 0.7);
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 6);
    this.apply();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.pitchNode.getWorldQuaternion(new THREE.Quaternion()));
    this.rig.position.addScaledVector(dir, this.speed * dt);
    // Soft wall: clamp to the bubble and nudge the nose back toward the center.
    const d = this.rig.position.length();
    const lim = this.bounds * 0.4;
    this.outside = d > lim * 0.9;
    if (d > lim) {
      this.rig.position.multiplyScalar(lim / d);
      const toCenter = Math.atan2(-this.rig.position.x, -this.rig.position.z);
      let diff = toCenter - this.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.yaw += diff * Math.min(1, dt * 2);
    }
    this.mesh.position.y = (-0.35 + Math.sin(performance.now() * 0.004) * 0.03) * this.s;
  }

  get position() { return this.rig.position; }
}

function makePlaceholderBroom() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.8 });
  const straw = new THREE.MeshStandardMaterial({ color: 0xc9a54a, roughness: 1 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.8, 12), wood);
  handle.rotation.x = Math.PI / 2;
  g.add(handle);
  const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 14), straw);
  bristles.rotation.x = -Math.PI / 2;
  bristles.position.z = 1.1;
  g.add(bristles);
  return g;
}
