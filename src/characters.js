import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Characters living in a world. Each is a Tripo mesh rigged on Meshy, plus extra Meshy
// clips (one GLB per clip, same rig) for what they do on their own, a wave hello, and
// talking. Until the GLB exists they are a placeholder capsule.
//
// States: "ambient" (busy with their own thing) -> player walks up: "greet" (wave once, turn
// to face) -> "attend" (relaxed, facing the player) <-> "talk" (while their voice line plays).
const CLIPS = {
  Harry: { ambient: 129, talk: 313, wave: 290 },       // practising a spell
  Hermione: { ambient: 36, talk: 309, wave: 290 },     // puzzling over something
  Dumbledore: { ambient: 11, talk: 308, wave: 290 },   // calm idle
};
const clipUrl = (name, id) => `/characters/${name.toLowerCase()}-a${id}.glb`;

// Shared idle motion: the Mixamo "idle" and "agree" clips that ship with three.js's Xbot,
// retargeted by bone name onto each Meshy rig (same Mixamo skeleton names).
const USE_IDLE = new URLSearchParams(location.search).has("idle"); // off: the plain name retarget twists the arms
let idleClips = null;
function loadIdle(loader) {
  idleClips ??= (async () => {
    try {
      const g = await loader.loadAsync("/models/xbot.glb");
      const pick = (n) => g.animations.find((c) => c.name === n) || null;
      return { idle: pick("idle"), nod: pick("agree") };
    } catch (e) { console.warn("idle clips failed", e); return {}; }
  })();
  return idleClips;
}
function retarget(clip, model) {
  if (!clip) return null;
  const tracks = [], byName = new Map();
  model.traverse((o) => { if (o.isBone) byName.set(o.name.toLowerCase(), o); }); // Meshy: "neck", "Spine02"
  for (const t of clip.tracks) {
    if (!t.name.endsWith(".quaternion")) continue; // rotations only: positions are in Mixamo's scale
    const bone = t.name.replace(/^mixamorig:?/, "").replace(".quaternion", "");
    if (bone === "Hips") continue; // keeps the character facing where we turned it
    const target = byName.get(bone.toLowerCase()) || byName.get(bone.replace(/Spine(\d)$/, "Spine0$1").toLowerCase());
    if (!target) continue;
    const c = t.clone(); c.name = `${target.name}.quaternion`; tracks.push(c);
  }
  return tracks.length ? new THREE.AnimationClip(clip.name, clip.duration, tracks) : null;
}

export class Characters {
  constructor(scene, list, R, height) {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    this.R = R; this.height = height ?? R * 0.36;
    this.items = list.map((c) => this.spawn(c));
    this.near = null; this.t = 0;
  }
  spawn(c) {
    const root = new THREE.Group();
    root.position.set(...c.pos); root.rotation.y = c.yaw ?? 0;
    const h = this.height;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.16, h * 0.55, 6, 12), new THREE.MeshStandardMaterial({ color: c.color ?? 0x7a5cff, roughness: 0.6 }));
    body.position.y = h * 0.45; root.add(body);
    // soft contact shadow so the figure sits on the splat floor instead of floating
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(h * 0.3, 24), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.8 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; shadow.renderOrder = 1; root.add(shadow);
    this.group.add(root);
    const item = { ...c, root, body, h, state: "ambient", clips: {}, action: null, stateT: 0 };
    this.load(item);
    return item;
  }
  async load(item) {
    try {
      const head = await fetch(item.file, { method: "HEAD" });
      if (!head.ok || !(head.headers.get("content-type") || "").includes("model")) return;
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(item.file);
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const s = item.h / size.y; m.scale.setScalar(s);
      m.position.y = -box.min.y * s;
      item.root.remove(item.body); item.root.add(m); item.model = m;
      item.pose = relaxedPose(m);
      item.mixer = new THREE.AnimationMixer(m);
      console.log("Loaded character", item.name);
      // Extra clips share the rig, so they retarget by bone name onto this model.
      const ids = CLIPS[item.name] || {};
      await Promise.all(Object.entries(ids).map(async ([key, id]) => {
        try {
          const url = clipUrl(item.name, id);
          const h2 = await fetch(url, { method: "HEAD" });
          if (!h2.ok || !(h2.headers.get("content-type") || "").includes("model")) return;
          const g = await loader.loadAsync(url);
          if (g.animations?.[0]) item.clips[key] = g.animations[0];
        } catch (e) { console.warn("clip failed", item.name, key, e); }
      }));
      // Natural idle for everyone: Mixamo idle while ambient and attending, a nod while talking.
      if (USE_IDLE) {
        const idle = await loadIdle(loader);
        item.clips.ambient ??= retarget(idle.idle, m);
        item.clips.attend ??= item.clips.ambient;
        item.clips.talk ??= retarget(idle.nod, m);
      }
      console.log("Clips", item.name, Object.keys(item.clips));
      this.enter(item, "ambient");
    } catch (e) { console.warn("Character load failed", item.name, e); }
  }
  // Switch state. Clip states fade in from the relaxed pose; "attend" fades everything out.
  enter(item, state) {
    if (item.state === state) return;
    item.state = state; item.stateT = 0;
    if (!item.mixer) return;
    const clip = item.clips[state === "greet" ? "wave" : state];
    if (item.action) { item.action.fadeOut(0.35); item.action = null; }
    if (clip) {
      const a = item.mixer.clipAction(clip);
      a.reset().setLoop(state === "greet" ? THREE.LoopOnce : THREE.LoopRepeat, Infinity).fadeIn(0.35).play();
      a.clampWhenFinished = true;
      item.action = a;
    }
  }
  // Face the player when near, run the state machine, tick animations.
  // talkingTo: name of the character in conversation, speaking: their voice line is playing.
  update(dt, playerPos, talkingTo = null, speaking = false) {
    this.t += dt;
    let best = null, bestD = this.R * 0.14;
    for (const it of this.items) {
      it.stateT += dt;
      const d = Math.hypot(it.root.position.x - playerPos.x, it.root.position.z - playerPos.z);
      const close = d < this.R * 0.3;
      if (close) {
        const target = Math.atan2(playerPos.x - it.root.position.x, playerPos.z - it.root.position.z);
        let diff = target - it.root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        it.root.rotation.y += diff * Math.min(1, dt * 4);
      }
      if (d < bestD) { best = it; bestD = d; }
      // state machine
      if (talkingTo === it.name) this.enter(it, speaking ? "talk" : "attend");
      else if (close) {
        if (it.state === "ambient") this.enter(it, it.clips.wave ? "greet" : "attend");
        else if (it.state === "greet" && it.stateT > (it.clips.wave?.duration ?? 1.5) - 0.3) this.enter(it, "attend");
        else if (it.state === "talk") this.enter(it, "attend");
      } else if (it.state !== "ambient" && it.stateT > 1.5) this.enter(it, "ambient");
      // relaxed pose underneath: bones not driven by a clip drift back to it and breathe
      if (it.pose && (it.state === "attend" || !it.action)) settle(it.pose, dt, this.t + it.root.position.x * 7);
      it.mixer?.update(dt);
    }
    this.near = best;
    return best;
  }
}

// Read a Mixamo-named rig, swing each upper arm down to hang at the side, and remember that
// pose. Returns the bones we keep moving, or null when there is no skeleton.
function relaxedPose(model) {
  let skinned = null;
  model.traverse((o) => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  if (!skinned) return null;
  // The file's node transforms are the rest pose (the A-pose concept). Skeleton.pose() is not
  // usable here: Meshy parents the bones under a transformed armature node and it lands them
  // at the origin.
  model.updateMatrixWorld(true);
  model.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; }); // bounds come from the unposed mesh
  const arms = [];
  for (const side of ["Left", "Right"]) {
    const arm = model.getObjectByName(side + "Arm"), fore = model.getObjectByName(side + "ForeArm");
    if (!arm || !fore) continue;
    const a = arm.getWorldPosition(new THREE.Vector3()), b = fore.getWorldPosition(new THREE.Vector3());
    const now = b.sub(a).normalize();
    const want = new THREE.Vector3(Math.sign(now.x) * 0.18, -1, 0.05).normalize(); // hang down, a touch out and forward
    const turn = new THREE.Quaternion().setFromUnitVectors(now, want);
    const parentQ = arm.parent.getWorldQuaternion(new THREE.Quaternion());
    arm.quaternion.premultiply(parentQ.clone().invert().multiply(turn).multiply(parentQ));
    arms.push({ bone: arm, sign: Math.sign(now.x) });
  }
  const rest = new Map();
  model.traverse((o) => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
  const spine = model.getObjectByName("Spine02") || model.getObjectByName("Spine");
  return { arms, spine, rest };
}

// Ease every bone toward the relaxed pose and hold it still.
function settle(pose, dt, t) {
  const k = Math.min(1, dt * 5), q = new THREE.Quaternion();
  for (const [bone, rq] of pose.rest) bone.quaternion.slerp(rq, k);
  // a barely visible breath on the spine only; the arms stay still
  if (pose.spine) { q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(t * 1.2) * 0.006); pose.spine.quaternion.multiply(q); }
}

let _shadowTex = null;
function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.9)"); grad.addColorStop(0.5, "rgba(0,0,0,0.45)"); grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  _shadowTex = new THREE.CanvasTexture(c); return _shadowTex;
}
