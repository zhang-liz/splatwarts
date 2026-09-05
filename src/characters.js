import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Characters standing in a world. Each is a GLB (Tripo export, rigged, with
// an idle clip) or a placeholder capsule until the GLB exists.
export class Characters {
  constructor(scene, list, R, height) {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    this.R = R; this.height = height ?? R * 0.36; this.mixers = [];
    this.items = list.map((c) => this.spawn(c));
    this.near = null;
  }
  spawn(c) {
    const root = new THREE.Group();
    root.position.set(...c.pos); root.rotation.y = c.yaw ?? 0;
    const h = this.height; // character height in world units
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.16, h * 0.55, 6, 12), new THREE.MeshStandardMaterial({ color: c.color ?? 0x7a5cff, roughness: 0.6 }));
    body.position.y = h * 0.45; root.add(body);
    const label = makeLabel(c.name); label.position.y = h * 1.15; label.scale.setScalar(h * 0.5); root.add(label);
    this.group.add(root);
    const item = { ...c, root, body, label, h };
    this.load(item);
    return item;
  }
  async load(item) {
    try {
      const head = await fetch(item.file, { method: "HEAD" });
      if (!head.ok || !(head.headers.get("content-type") || "").includes("model")) return;
      const gltf = await new GLTFLoader().loadAsync(item.file);
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const s = item.h / size.y; m.scale.setScalar(s);
      m.position.y = -box.min.y * s;
      item.root.remove(item.body); item.root.add(m); item.model = m;
      if (gltf.animations?.length) {
        const mixer = new THREE.AnimationMixer(m);
        const idle = gltf.animations.find((a) => /idle/i.test(a.name)) || gltf.animations[0];
        mixer.clipAction(idle).play(); this.mixers.push(mixer);
      }
      console.log("Loaded character", item.name, gltf.animations?.map((a) => a.name));
    } catch (e) { console.warn("Character load failed", item.name, e); }
  }
  // Face the player, tick animations, find who is close enough to talk to.
  update(dt, playerPos) {
    for (const m of this.mixers) m.update(dt);
    let best = null, bestD = this.R * 0.14;
    for (const it of this.items) {
      const d = Math.hypot(it.root.position.x - playerPos.x, it.root.position.z - playerPos.z);
      if (d < this.R * 0.5) {
        const target = Math.atan2(playerPos.x - it.root.position.x, playerPos.z - it.root.position.z);
        let diff = target - it.root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        it.root.rotation.y += diff * Math.min(1, dt * 3);
      }
      if (d < bestD) { best = it; bestD = d; }
    }
    this.near = best;
    return best;
  }
}

function makeLabel(text) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.font = "bold 72px Georgia"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 10; ctx.strokeStyle = "#000"; ctx.strokeText(text, 256, 64);
  ctx.fillStyle = "#fff"; ctx.fillText(text, 256, 64);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sprite.scale.set(4, 1, 1);
  return sprite;
}
