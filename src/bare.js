// Bisect page. Same as Spark's streaming example, plus switches:
//   ?rig=1     camera parented inside Group > Group like the game
//   ?meshes=1  add a torus, a sprite, and lights like the game
//   ?cb=1      add onLoad/onProgress callbacks like the game
import * as THREE from "three";
import { SparkRenderer, SplatMesh, SparkControls } from "@sparkjsdev/spark";

const q = new URLSearchParams(location.search);
const info = document.getElementById("i");
const log = (s) => { info.textContent += s + "\n"; console.log(s); };

const scene = new THREE.Scene();
scene.background = new THREE.Color("#cafefe");
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas") });
renderer.setSize(innerWidth, innerHeight);

const spark = new SparkRenderer({ renderer, pagedExtSplats: true, coneFov0: 70, coneFov: 120, behindFoveate: 0.2, coneFoveate: 0.4 });
scene.add(spark);

const opts = { url: "https://storage.googleapis.com/forge-dev-public/asundqui/rad/260219/tijerin_w6_hobbiton-lod.rad", paged: true };
if (q.get("cb")) {
  opts.onProgress = (e) => log(`progress ${e.loaded}/${e.total}`);
  opts.onLoad = () => log("onLoad");
}
const world = new SplatMesh(opts);
world.quaternion.set(1, 0, 0, 0);
scene.add(world);

let controlTarget = camera;
if (q.get("rig")) {
  const rig = new THREE.Group(); const pitch = new THREE.Group();
  rig.add(pitch); pitch.add(camera); scene.add(rig);
  camera.position.set(0, 0.6, 1.6); rig.position.set(0, 2, 0);
  controlTarget = rig;
}
if (q.get("meshes")) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 10, 2); scene.add(sun);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.18, 16, 48), new THREE.MeshStandardMaterial({ color: 0xffc23a, emissive: 0xffa500 }));
  torus.position.set(0, 2, -14); scene.add(torus);
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sprite.position.set(0, 5, -14); scene.add(sprite);
}
log(`flags rig=${!!q.get("rig")} meshes=${!!q.get("meshes")} cb=${!!q.get("cb")}`);

const controls = new SparkControls({ canvas: renderer.domElement });
let n = 0;
renderer.setAnimationLoop(() => {
  controls.update(controlTarget);
  renderer.render(scene, camera);
  if (++n % 120 === 0) log(`frame ${n} numSplats=${world.numSplats} paged=${world.paged?.numSplats}`);
});
window.__dbg = { world, spark, scene, camera };
