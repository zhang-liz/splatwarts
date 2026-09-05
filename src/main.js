import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { pickWorld } from "./worlds.js";
import { buildCourse, HAND_COURSE } from "./course.js";
import { Rings } from "./rings.js";
import { Broom } from "./broom.js";
import { Hud, chime } from "./hud.js";

const world = pickWorld();
const canvas = document.getElementById("canvas");
const hud = new Hud();

const scene = new THREE.Scene();
scene.background = new THREE.Color(world.background);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 2000);
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

hud.setLoading(`Loading ${world.name}…`);
const splat = new SplatMesh({
  url: world.url,
  paged: world.paged,
  onProgress: (e) => { if (e.total) hud.setLoading(`Loading ${world.name} ${Math.round(100 * e.loaded / e.total)}%`); },
  onLoad: () => hud.setLoading(`${world.name} · ${world.credit}`),
});
splat.quaternion.set(...world.quaternion).normalize();
splat.position.set(...world.position);
splat.scale.setScalar(world.scale);
scene.add(splat);
if (world.paged) hud.setLoading(`${world.name} · ${world.credit}`);

const broom = new Broom(camera, canvas, world.spawn);
scene.add(broom.rig);

const course = HAND_COURSE
  ? HAND_COURSE.map((p, i, arr) => {
      const position = new THREE.Vector3(...p);
      const prev = i === 0 ? new THREE.Vector3(...world.spawn.position) : new THREE.Vector3(...arr[i - 1]);
      return { position, normal: position.clone().sub(prev).normalize() };
    })
  : buildCourse(world.spawn);
const rings = new Rings(scene, course);

let state = "ready"; // ready | flying | done
let t0 = 0, elapsed = 0;
function restart() {
  broom.reset(); rings.reset();
  state = "ready"; elapsed = 0;
  hud.setTime(0); hud.setRings(0, rings.total);
  hud.setMsg(broom.enabled ? "Fly through ring 1 to start" : "Click to mount the broom");
}
restart();

addEventListener("keydown", (e) => {
  if (e.code === "KeyR") restart();
  if (e.code === "KeyP") {
    const p = broom.position, q = camera.getWorldQuaternion(new THREE.Quaternion());
    console.log(`spawn: { position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}], yaw: ${broom.yaw.toFixed(3)}, pitch: ${broom.pitch.toFixed(3)} }`);
    console.log(`ring: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}],`);
  }
});
document.addEventListener("pointerlockchange", () => {
  if (broom.enabled && state === "ready") hud.setMsg("Fly through ring 1 to start");
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  broom.update(dt);
  const passed = rings.update(broom.position, dt, time);
  if (passed) {
    chime(rings.next);
    if (state === "ready") { state = "flying"; t0 = time; hud.setMsg(""); }
    hud.setRings(rings.next, rings.total);
    if (rings.done) { state = "done"; elapsed = time - t0; hud.finish(elapsed); }
  }
  if (state === "flying") { elapsed = time - t0; hud.setTime(elapsed); }
  hud.setSpeed(broom.speed);
  renderer.render(scene, camera);
});

// Debug handles. Open the console and poke at window.__dbg.
window.__dbg = { splat, spark, scene, camera, broom, rings, renderer };
