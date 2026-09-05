import * as THREE from "three";

// On foot. WASD moves on the floor plane, mouse looks, Shift runs.
// Eye stays at `eye` height. Movement stays inside the world radius.
export class Walker {
  constructor(camera, canvas) {
    this.camera = camera; this.canvas = canvas;
    this.rig = new THREE.Group();
    this.pitchNode = new THREE.Group();
    this.rig.add(this.pitchNode); this.pitchNode.add(camera);
    this.yaw = 0; this.pitch = 0;
    this.keys = new Set(); this.locked = false; this.enabled = false; this.ready = false;
    this.eye = 0; this.bounds = 10; this.speed = 1.5;
    this.frozen = false; // true while talking
    window.addEventListener("keydown", (e) => this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
    this._onMove = (e) => {
      if (!this.locked || !this.active) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.3, 1.3);
    };
    document.addEventListener("mousemove", this._onMove);
    document.addEventListener("pointerlockchange", () => { this.locked = document.pointerLockElement === canvas; if (this.locked) this.enabled = true; });
    this.active = false;
  }
  setScale(R, eye = 0) { this.bounds = R; this.eye = eye; this.speed = R * 0.12; this.camera.position.set(0, 0, 0); }
  reset(spawn) {
    if (spawn) this.spawn = spawn;
    this.rig.position.set(...this.spawn.position); this.rig.position.y = this.eye;
    this.yaw = this.spawn.yaw; this.pitch = 0; this.apply();
  }
  apply() { this.rig.rotation.set(0, this.yaw, 0); this.pitchNode.rotation.set(this.pitch, 0, 0); }
  update(dt) {
    this.apply();
    if (!this.enabled || !this.ready || this.frozen) return;
    const k = this.keys;
    const v = new THREE.Vector3();
    if (k.has("KeyW") || k.has("ArrowUp")) v.z -= 1;
    if (k.has("KeyS") || k.has("ArrowDown")) v.z += 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) v.x -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) v.x += 1;
    if (v.lengthSq() === 0) return;
    v.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const s = this.speed * ((k.has("ShiftLeft") || k.has("ShiftRight")) ? 2 : 1);
    this.rig.position.addScaledVector(v, s * dt);
    const flat = new THREE.Vector2(this.rig.position.x, this.rig.position.z);
    if (flat.length() > this.bounds * 0.8) { flat.setLength(this.bounds * 0.8); this.rig.position.x = flat.x; this.rig.position.z = flat.y; }
    this.rig.position.y = this.eye;
  }
  get position() { return this.rig.position; }
}
