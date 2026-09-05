import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { pickWorld, measureRadius } from "./worlds.js";
import { buildCourse, spawnFor, HAND_COURSE } from "./course.js";
import { Rings } from "./rings.js";
import { Broom } from "./broom.js";
import { Hud, chime } from "./hud.js";

const world = pickWorld();
const canvas = document.getElementById("canvas");
const hud = new Hud();

const scene = new THREE.Scene();
scene.background = new THREE.Color(world.background);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.02, 2000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const spark = new SparkRenderer({
  renderer,
  pagedExtSplats: world.paged,
  coneFov0: 70, coneFov: 120, behindFoveate: 0.2, coneFoveate: 0.4,
});
scene.add(spark);

// Lights only affect the meshes (rings, broom). Splats carry their own color.
scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 10, 2); scene.add(sun);

const broom = new Broom(camera, canvas);
scene.add(broom.rig);

let rings = null;
let state = "loading"; // loading | ready | flying | done
let t0 = 0, elapsed = 0;

function setupCourse(R) {
  world.radius = R;
  const course = HAND_COURSE
    ? HAND_COURSE.map((p, i, arr) => {
        const position = new THREE.Vector3(...p);
        const prev = i === 0 ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(...arr[i - 1]);
        return { position, normal: position.clone().sub(prev).normalize() };
      })
    : buildCourse(R);
  rings = new Rings(scene, course, R / 14);
  broom.setScale(R);
  broom.reset(spawnFor(course, R));
  broom.ready = true;
  hud.setLoading(`${world.name} · ${world.credit} · radius ${R.toFixed(1)}`);
  restart();
}

hud.setLoading(`Loading ${world.name}…`);
hud.setMsg("Loading world…");
const splat = new SplatMesh({
  url: world.url,
  paged: world.paged,
  onProgress: (e) => { if (e.total) hud.setLoading(`Loading ${world.name} ${Math.round(100 * e.loaded / e.total)}%`); },
  onLoad: () => {
    const R = world.radius ?? measureRadius(splat) ?? 15;
    setupCourse(R);
  },
});
splat.quaternion.set(...world.quaternion).normalize();
splat.position.set(...world.position);
splat.scale.setScalar(world.scale);
scene.add(splat);
// Streamed worlds never fire onLoad up front. Give them a few seconds to arrive.
if (world.paged) setTimeout(() => { if (!rings) setupCourse(world.radius ?? 15); }, 6000);

function restart() {
  if (!rings) return;
  broom.reset(); rings.reset();
  state = "ready"; elapsed = 0;
  hud.setTime(0); hud.setRings(0, rings.total);
  hud.setMsg(broom.enabled ? "Press W to fly. Ring 1 starts the clock." : "Click to mount the broom");
}

addEventListener("keydown", (e) => {
  if (e.code === "KeyR") restart();
  if (e.code === "KeyP") {
    const p = broom.position;
    console.log(`spawn: { position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}], yaw: ${broom.yaw.toFixed(3)}, pitch: ${broom.pitch.toFixed(3)} }`);
    console.log(`ring: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}],`);
  }
});
document.addEventListener("pointerlockchange", () => {
  if (broom.enabled && state === "ready") hud.setMsg("Press W to fly. Ring 1 starts the clock.");
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
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
  renderer.render(scene, camera);
});

// Debug handles. Open the console and poke at window.__dbg.
window.__dbg = { splat, spark, scene, camera, broom, get rings() { return rings; }, renderer, world };
