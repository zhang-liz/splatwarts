import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Broom flight. Camera rides the broom. Mouse steers (pointer lock).
// W/S throttle, Shift boost, Space brake. Banks into turns.
export class Broom {
  constructor(camera, canvas, spawn) {
    this.camera = camera;
    this.canvas = canvas;
    this.spawn = spawn;
    this.rig = new THREE.Group();      // position + yaw
    this.pitchNode = new THREE.Group(); // pitch
    this.rig.add(this.pitchNode);
    this.pitchNode.add(camera);
    camera.position.set(0, 0.6, 1.6);  // slightly above and behind the broom head
    this.mesh = makePlaceholderBroom();
    this.pitchNode.add(this.mesh);
    this.mesh.position.set(0, -0.35, 0);

    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.speed = 0;
    this.baseSpeed = 8; this.maxSpeed = 22; this.boost = 2.2;
    this.keys = new Set();
    this.locked = false;
    this.enabled = false;
    this.reset();

    window.addEventListener("keydown", (e) => this.keys.add(e.code));
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

  async loadModel(url) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (!r.ok) return;
      const gltf = await new GLTFLoader().loadAsync(url);
      const m = gltf.scene;
      // Tripo exports are usually ~1 unit tall. Lay the broom along -Z.
      m.rotation.set(0, 0, 0);
      m.scale.setScalar(1.2);
      m.position.set(0, -0.35, 0);
      this.pitchNode.remove(this.mesh);
      this.mesh = m;
      this.pitchNode.add(m);
      console.log("Loaded broom model", url);
    } catch (e) { console.warn("No broom.glb, using placeholder", e); }
  }

  reset() {
    this.rig.position.set(...this.spawn.position);
    this.yaw = this.spawn.yaw; this.pitch = this.spawn.pitch; this.roll = 0;
    this.speed = this.baseSpeed;
    this.apply();
  }

  apply() {
    this.rig.rotation.set(0, this.yaw, 0);
    this.pitchNode.rotation.set(this.pitch, 0, this.roll);
  }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    let target = this.baseSpeed;
    if (k.has("KeyW") || k.has("ArrowUp")) target = this.maxSpeed;
    if (k.has("KeyS") || k.has("ArrowDown")) target = this.baseSpeed * 0.4;
    if (k.has("Space")) target = 0;
    if (k.has("ShiftLeft") || k.has("ShiftRight")) target *= this.boost;
    // Smooth throttle
    this.speed += (target - this.speed) * Math.min(1, dt * 2.5);
    // A/D nudge yaw for keyboard-only play
    if (k.has("KeyA") || k.has("ArrowLeft")) this.yaw += dt * 1.4;
    if (k.has("KeyD") || k.has("ArrowRight")) this.yaw -= dt * 1.4;
    // Bank into turns
    const yawRate = (this.yaw - (this._prevYaw ?? this.yaw)) / Math.max(dt, 1e-3);
    this._prevYaw = this.yaw;
    const targetRoll = THREE.MathUtils.clamp(yawRate * 0.25, -0.7, 0.7);
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 6);
    this.apply();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.pitchNode.getWorldQuaternion(new THREE.Quaternion()));
    this.rig.position.addScaledVector(dir, this.speed * dt);
    // Broom bob
    this.mesh.position.y = -0.35 + Math.sin(performance.now() * 0.004) * 0.03;
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
