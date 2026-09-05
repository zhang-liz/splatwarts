import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { worldFromQuery, measureRadius, measureFloor, START } from "./worlds.js";
import { buildCourse, spawnFor, HAND_COURSE } from "./course.js";
import { Rings } from "./rings.js";
import { Broom } from "./broom.js";
import { Walker } from "./walker.js";
import { Characters } from "./characters.js";
import { Dialogue } from "./dialogue.js";
import { Spells } from "./spells.js";
import { Hud, chime, music } from "./hud.js";
import { Post } from "./post.js";
import { Candles } from "./candles.js";

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
  renderer.setSize(innerWidth, innerHeight); post?.resize();
});
const spark = new SparkRenderer({ renderer, pagedExtSplats: true, coneFov0: 70, coneFov: 120, behindFoveate: 0.2, coneFoveate: 0.4 });
scene.add(spark);
scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 10, 2); scene.add(sun);

const post = new Post(renderer, scene, camera);
const broom = new Broom(camera, canvas);
const walker = new Walker(camera, canvas);
const dialogue = new Dialogue();
const spells = new Spells(scene, camera, hud);
spells.targets = () => chars?.items ?? [];
dialogue.onClose = () => { walker.frozen = false; hud.setMsg("Click to look around"); music.duck(false); if (voiceOn) spells.listen(true); };
let voiceOn = false;
addEventListener("keydown", (e) => { if (e.code === "KeyV" && e.target?.tagName !== "INPUT") { voiceOn = !voiceOn; spells.listen(voiceOn); } });
canvas.addEventListener("click", () => { if (dialogue.open) { dialogue.close(); dialogue.onClose?.(); } canvas.requestPointerLock(); music.start(); document.getElementById("title").classList.add("gone"); document.body.classList.remove("intro"); });

// ---- current world state ----
let world = null, splat = null, rings = null, chars = null, pad = null, door = null, candles = null;
let intro = false; // camera orbits the castle until the broom is first mounted
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
  disc.rotation.x = -Math.PI / 2; disc.renderOrder = 1; g.add(disc);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 2.5, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = r * 1.25; beam.renderOrder = 1; g.add(beam);
  return g;
}

async function loadWorld(key) {
  switching = true; spells.enabled = false; spells.listen(false);
  fade.style.opacity = 1;
  await new Promise((r) => setTimeout(r, 650));
  // tear down
  if (splat) { scene.remove(splat); splat.dispose?.(); splat = null; }
  stage.clear(); rings = null; chars = null; pad = null; door = null; candles = null; intro = false;
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
  if (mode === "walk") setTimeout(() => hud.setLoading(`${world.name} · ${world.credit} · r ${R.toFixed(1)} · floor ${world.floorY?.toFixed(2)}`), 0);
  if (mode === "fly") {
    const course = HAND_COURSE ? HAND_COURSE.map((p, i, arr) => {
      const position = new THREE.Vector3(...p);
      const prev = i === 0 ? new THREE.Vector3() : new THREE.Vector3(...arr[i - 1]);
      return { position, normal: position.clone().sub(prev).normalize() };
    }) : buildCourse(R);
    rings = new Rings(stage, course, R * 0.12);
    broom.setScale(R);
    broom.reset(spawnFor(course, R));
    broom.ready = true;
    intro = !broom.enabled;
    const ground = measureFloor(splat, R);
    const p = world.pad ?? [0, (ground ?? -R * 0.3) + R * 0.05, R * 0.95];
    pad = makeDisc(0x66ccff, R * 0.1); pad.position.set(...p); stage.add(pad);
    hintEl.textContent = "Mouse steer · W fly · Shift boost · Space stop · R restart · V voice spells · 1-6 spells · Land on the blue pad to enter the castle";
  } else {
    walker.setScale(R, world.eye ?? 0);
    walker.reset({ position: [0, 0, R * 0.05], yaw: 0 });
    walker.ready = true;
    // Floor: Marble puts the input camera at the origin at eye level, so the floor
    // sits about a third of the world radius below it.
    const floor = world.floor ?? measureFloor(splat, R) ?? (world.eye ?? 0) - R * 0.33;
    world.floorY = floor;
    chars = new Characters(stage, (world.characters ?? []).map((c) => ({ ...c, pos: [c.pos[0] * R, floor, c.pos[2] * R] })), R, ((world.eye ?? 0) - floor) * 1.1);
    const d = world.door ?? [0, floor, R * 0.5];
    door = makeDisc(0xffaa33, R * 0.07); door.position.set(...d); stage.add(door);
    if (world.candles) candles = new Candles(stage, R, floor, world.eye ?? 0);
    hintEl.textContent = "WASD walk · E talk · V voice spells on/off · 1 Lumos · 2 Incendio · 3 Patronum · 4 Expelliarmus · 5 Leviosa · 6 Reducto · 0 Nox · Orange pad: broom";
  }
  spells.setScale(R, mode === "walk" ? ((world.eye ?? 0) - world.floorY) : null); spells.enabled = true; spells.nox();
  post.look(mode);
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
    if (!dialogue.open && chars?.near) {
      e.preventDefault();
      spells.listen(false); dialogue.start(chars.near); walker.frozen = true; hud.setMsg(""); music.duck(true);
      document.exitPointerLock?.();
      setTimeout(() => dialogue.input.focus(), 50);
    } else if (dialogue.open && !e.repeat) dialogue.listen(true);
  }
  if (e.code === "Escape" && dialogue.open) { dialogue.close(); dialogue.onClose?.(); }
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
      if (intro) {
        if (broom.enabled) { intro = false; broom.reset(); }
        else {
          // slow orbit around the castle, looking in, until the first click
          const R = world.radius, a = Math.PI + time * 0.1;
          broom.rig.position.set(Math.sin(a) * R * 0.5, R * 0.12 + Math.sin(time * 0.3) * R * 0.02, Math.cos(a) * R * 0.5);
          broom.yaw = Math.atan2(-broom.rig.position.x, -broom.rig.position.z); broom.pitch = -0.12;
        }
      }
      broom.update(dt);
      if (rings && !intro) {
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
        if (broom.ready && broom.position.distanceTo(pad.position) < R * 0.13) { hud.setMsg("Landing…"); loadWorld(world.next); }
      }
    } else {
      walker.update(dt);
      if (chars) {
        const near = chars.update(dt, walker.position, dialogue.character?.name ?? null, dialogue.speaking);
        if (!dialogue.open) hud.setMsg(near ? `Press E to talk to ${near.name}` : "");
      }
      if (door) {
        door.rotation.y += dt * 0.5;
        const flat = new THREE.Vector2(walker.position.x - door.position.x, walker.position.z - door.position.z);
        if (walker.ready && flat.length() < world.radius * 0.08) { walker.frozen = false; dialogue.close(); loadWorld(world.next); }
      }
    }
  }
  spells.update(dt, clock.elapsedTime);
  candles?.update(dt, camera);
  post.render(scene, camera);
});

loadWorld(new URLSearchParams(location.search).get("world") || START);
window.__dbg = { THREE, get world() { return world; }, get splat() { return splat; }, spark, scene, camera, broom, walker, get rings() { return rings; }, get chars() { return chars; }, dialogue, spells };
