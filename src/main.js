import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { worldFromQuery, measureRadius, START } from "./worlds.js";
import { buildCourse, spawnFor, HAND_COURSE } from "./course.js";
import { Rings } from "./rings.js";
import { Broom } from "./broom.js";
import { Walker } from "./walker.js";
import { Characters } from "./characters.js";
import { Dialogue } from "./dialogue.js";
import { Hud, chime } from "./hud.js";

const canvas = document.getElementById("canvas");
const hud = new Hud();
const fade = document.getElementById("fade");
const hintEl = document.getElementById("hint");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.02, 2000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
const spark = new SparkRenderer({ renderer, pagedExtSplats: true, coneFov0: 70, coneFov: 120, behindFoveate: 0.2, coneFoveate: 0.4 });
scene.add(spark);
scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 10, 2); scene.add(sun);

const broom = new Broom(camera, canvas);
const walker = new Walker(camera, canvas);
const dialogue = new Dialogue();
canvas.addEventListener("click", () => canvas.requestPointerLock());

// ---- current world state ----
let world = null, splat = null, rings = null, chars = null, pad = null, door = null;
let mode = "fly", state = "loading", t0 = 0, elapsed = 0;
let switching = false;
const stage = new THREE.Group(); scene.add(stage); // everything that belongs to one world

function mount(rig) {
  if (camera.parent) camera.parent.remove(camera);
  scene.remove(broom.rig); scene.remove(walker.rig);
  if (rig === broom) { broom.pitchNode.add(camera); scene.add(broom.rig); }
  else { walker.pitchNode.add(camera); scene.add(walker.rig); }
}

function makeDisc(color, r) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 12, 48), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 }));
  ring.rotation.x = Math.PI / 2; g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; g.add(disc);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 2.5, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = r * 1.25; g.add(beam);
  return g;
}

async function loadWorld(key) {
  switching = true;
  fade.style.opacity = 1;
  await new Promise((r) => setTimeout(r, 650));
  // tear down
  if (splat) { scene.remove(splat); splat.dispose?.(); splat = null; }
  stage.clear(); rings = null; chars = null; pad = null; door = null;
  dialogue.close();
  world = worldFromQuery(key);
  mode = world.mode;
  scene.background = new THREE.Color(world.background);
  state = "loading";
  hud.setLoading(`Loading ${world.name}…`); hud.setMsg("Loading world…");
  hud.timer.style.display = mode === "fly" ? "" : "none";
  hud.rings.style.display = mode === "fly" ? "" : "none";
  hud.speed.style.display = mode === "fly" ? "" : "none";
  mount(mode === "fly" ? broom : walker);
  broom.ready = false; walker.ready = false;

  splat = new SplatMesh({
    url: world.url, paged: world.paged,
    onProgress: (e) => { if (e.total) hud.setLoading(`Loading ${world.name} ${Math.round(100 * e.loaded / e.total)}%`); },
    onLoad: () => setup(world.radius ?? measureRadius(splat) ?? 15),
  });
  splat.quaternion.set(...(world.quaternion ?? [0, 0, 0, 1])).normalize();
  splat.position.set(...(world.position ?? [0, 0, 0]));
  scene.add(splat);
  if (world.paged) setTimeout(() => { if (state === "loading") setup(world.radius ?? 15); }, 6000);
}

function setup(R) {
  world.radius = R;
  hud.setLoading(`${world.name} · ${world.credit} · r ${R.toFixed(1)}`);
  if (mode === "fly") {
    const course = HAND_COURSE ? HAND_COURSE.map((p, i, arr) => {
      const position = new THREE.Vector3(...p);
      const prev = i === 0 ? new THREE.Vector3() : new THREE.Vector3(...arr[i - 1]);
      return { position, normal: position.clone().sub(prev).normalize() };
    }) : buildCourse(R);
    rings = new Rings(stage, course, R / 14);
    broom.setScale(R);
    broom.reset(spawnFor(course, R));
    broom.ready = true;
    const p = world.pad ?? [0, -R * 0.3, R * 0.15];
    pad = makeDisc(0x66ccff, R * 0.09); pad.position.set(...p); stage.add(pad);
    hintEl.textContent = "Mouse: steer · W: fly / faster · S: slower · Shift: boost · Space: stop · R: restart · Land on the blue pad to enter the castle";
  } else {
    walker.setScale(R, world.eye ?? 0);
    walker.reset({ position: [0, 0, R * 0.05], yaw: 0 });
    walker.ready = true;
    chars = new Characters(stage, world.characters ?? [], R);
    const d = world.door ?? [0, (world.eye ?? 0) - R * 0.06, R * 0.5];
    door = makeDisc(0xffaa33, R * 0.07); door.position.set(...d); stage.add(door);
    hintEl.textContent = "WASD: walk · Shift: run · Walk up to someone and press E to talk · Hold E to speak · Esc: stop talking · Orange pad: back to the broom";
  }
  restart();
  fade.style.opacity = 0;
  switching = false;
}

function restart() {
  if (state === "loading" && !(rings || chars)) return;
  state = "ready"; elapsed = 0;
  if (mode === "fly") {
    broom.reset(); rings.reset();
    hud.setTime(0); hud.setRings(0, rings.total);
    hud.setMsg(broom.enabled ? "Press W to fly. Ring 1 starts the clock." : "Click to mount the broom");
  } else {
    hud.setMsg(walker.enabled ? "" : "Click to look around");
  }
}

addEventListener("keydown", (e) => {
  if (dialogue.open && e.target === dialogue.input) return;
  if (e.code === "KeyR" && mode === "fly") restart();
  if (e.code === "KeyE" && mode === "walk") {
    if (!dialogue.open && chars?.near) { dialogue.start(chars.near); walker.frozen = true; hud.setMsg(""); }
    else if (dialogue.open && !e.repeat) dialogue.listen(true);
  }
  if (e.code === "Escape" && dialogue.open) { dialogue.close(); walker.frozen = false; }
  if (e.code === "KeyP") {
    const p = (mode === "fly" ? broom : walker).position;
    console.log(`pos: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]  yaw ${(mode === "fly" ? broom : walker).yaw.toFixed(3)}`);
  }
});
addEventListener("keyup", (e) => { if (e.code === "KeyE" && dialogue.open) dialogue.listen(false); });
document.addEventListener("pointerlockchange", () => {
  if (state !== "ready") return;
  if (mode === "fly" && broom.enabled) hud.setMsg("Press W to fly. Ring 1 starts the clock.");
  if (mode === "walk" && walker.enabled) hud.setMsg("");
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  if (!switching && world) {
    if (mode === "fly") {
      broom.update(dt);
      if (rings) {
        const passed = rings.update(broom.position, dt, time);
        if (passed) {
          chime(rings.next);
          if (state === "ready") { state = "flying"; t0 = time; hud.setMsg(""); }
          hud.setRings(rings.next, rings.total);
          if (rings.done) { state = "done"; elapsed = time - t0; hud.finish(elapsed); }
        }
        if (state === "flying") { elapsed = time - t0; hud.setTime(elapsed); hud.setMsg(broom.outside ? "Turn back!" : ""); }
      }
      hud.setSpeed(broom.speed);
      if (pad) {
        pad.rotation.y += dt * 0.5;
        const R = world.radius;
        if (broom.ready && broom.position.distanceTo(pad.position) < R * 0.1) { hud.setMsg("Landing…"); loadWorld(world.next); }
      }
    } else {
      walker.update(dt);
      if (chars) {
        const near = chars.update(dt, walker.position);
        if (!dialogue.open) hud.setMsg(near ? `Press E to talk to ${near.name}` : "");
      }
      if (door) {
        door.rotation.y += dt * 0.5;
        const flat = new THREE.Vector2(walker.position.x - door.position.x, walker.position.z - door.position.z);
        if (walker.ready && flat.length() < world.radius * 0.08) { walker.frozen = false; dialogue.close(); loadWorld(world.next); }
      }
    }
  }
  renderer.render(scene, camera);
});

loadWorld(new URLSearchParams(location.search).get("world") || START);
window.__dbg = { get world() { return world; }, get splat() { return splat; }, spark, scene, camera, broom, walker, get rings() { return rings; }, get chars() { return chars; }, dialogue };
