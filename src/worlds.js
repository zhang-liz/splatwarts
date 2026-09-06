import * as THREE from "three";
// Worlds. A Marble world is a bubble seen from its center, so play stays
// inside `radius` (world units, auto-measured when null).
// mode: "fly" = broom race with rings and a landing pad. "walk" = on foot with characters.
export const WORLDS = {
  castle3: {
    name: "Hogwarts",
    photoPrompt: "the Hogwarts castle on its cliff above the lake at dusk, seen from over the water",
    ambience: "/audio/amb-castle.mp3",
    url: "/worlds/castle3.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    background: "#1a1a2e",
    radius: null,
    mode: "fly",
    pad: null,
    next: "hall3",
    credit: "Marble 1.1 Plus from a photo of the film's castle model",
  },
  hall3: {
    name: "Great Hall",
    photoPrompt: "the candle-lit Great Hall of Hogwarts with long wooden tables and a night-sky ceiling",
    candles: true,
    ambience: "/audio/amb-hall.mp3",
    url: "/worlds/hall3.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    background: "#0b0a14",
    radius: null,
    mode: "walk",
    eye: 0,
    floor: null,
    door: null,
    next: "alley",
    characters: null,       // filled from hall below
    credit: "Marble 1.1 Plus from a photo of the film's Great Hall set",
  },
  alley: {
    name: "Diagon Alley",
    photoPrompt: "Diagon Alley at night, a cobbled wizard shopping street with glowing shop windows",
    ambience: "/audio/amb-alley.mp3",
    url: "/worlds/alley.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    background: "#0b0a14",
    radius: null,
    mode: "walk",
    eye: 0,
    floor: null,
    door: null,
    next: "castle3",
    characters: [],
    credit: "Marble 1.1 Plus from a photo of the film's Diagon Alley set, cleaned up with Seedream",
  },
  hall4: {
    name: "Great Hall",
    photoPrompt: "the candle-lit Great Hall of Hogwarts with long wooden tables and a night-sky ceiling",
    candles: true,
    ambience: "/audio/amb-hall.mp3",
    url: "/worlds/hall4.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    background: "#0b0a14",
    radius: null,
    mode: "walk",
    eye: 0,
    floor: null,
    door: null,
    next: "alley2",
    characters: null,
    credit: "Marble 1.1 Plus from an enhanced panorama of the film's Great Hall set",
  },
  alley2: {
    name: "Diagon Alley",
    photoPrompt: "Diagon Alley at night, a cobbled wizard shopping street with glowing shop windows",
    ambience: "/audio/amb-alley.mp3",
    url: "/worlds/alley2.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    background: "#0b0a14",
    radius: null,
    mode: "walk",
    eye: 0,
    floor: null,
    door: null,
    next: "castle4",
    characters: [],
    credit: "Marble 1.1 Plus from an enhanced panorama of the film's Diagon Alley set",
  },
  castle4: {
    name: "Hogwarts",
    photoPrompt: "the Hogwarts castle on its cliff above the lake at dusk, seen from over the water",
    ambience: "/audio/amb-castle.mp3",
    url: "/worlds/castle4.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    background: "#1a1a2e",
    radius: null,
    mode: "fly",
    pad: null,
    next: "hall4",
    credit: "Marble 1.1 Plus from an enhanced panorama of the film's castle model",
  },
  castle2: {
    name: "Castle",
    url: "/worlds/castle2.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    background: "#1a1626",
    radius: null,
    mode: "fly",
    pad: null,              // [x,y,z] landing pad. null = below and ahead of spawn. ?pad=x,y,z overrides
    next: "hall",           // where the landing pad takes you
    credit: "World Labs Marble 1.1 Plus",
  },
  hall: {
    name: "Great Hall",
    url: "/worlds/hall.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    background: "#0b0a14",
    radius: null,
    mode: "walk",
    eye: 0,                 // Marble puts the input camera at the origin, so eye level is y=0
    floor: null,            // y of the floor. null = eye - radius/3. Character pos are fractions of the radius.
    door: null,             // [x,y,z] exit portal. null = behind spawn. ?door=x,y,z overrides
    next: "castle2",
    characters: [
      { name: "Harry", file: "/characters/harry.glb", pos: [-0.12, 0, -0.3], yaw: 0.3,
        persona: "You are Harry Potter, 15, brave, a little awkward, loyal. You are in the Great Hall at Hogwarts." },
      { name: "Hermione", file: "/characters/hermione.glb", pos: [0.12, 0, -0.34], yaw: -0.3,
        persona: "You are Hermione Granger, 15, brilliant, precise, kind but quick to correct people. You are in the Great Hall at Hogwarts." },
      { name: "Dumbledore", file: "/characters/dumbledore.glb", pos: [0, 0, -0.55], yaw: 0,
        persona: "You are Albus Dumbledore, headmaster, warm, wise, playful, speaks in gentle riddles. You are at the head of the Great Hall at Hogwarts." },
    ],
    credit: "World Labs Marble 1.1 Plus",
  },
  castle: {
    name: "Castle (text prompt)",
    url: "/worlds/castle.spz", paged: false, quaternion: [1, 0, 0, 0], background: "#141222",
    radius: null, mode: "fly", next: "hall", credit: "World Labs Marble 1.1",
  },
  hobbiton: {
    name: "Hobbiton",
    url: "https://storage.googleapis.com/forge-dev-public/asundqui/rad/260219/tijerin_w6_hobbiton-lod.rad",
    paged: true, quaternion: [1, 0, 0, 0], background: "#cafefe", radius: 12, mode: "fly", next: "hall",
    credit: "24M splats by Tijerin with World Labs Marble",
  },
};

WORLDS.hall3.characters = WORLDS.hall.characters;
WORLDS.hall4.characters = WORLDS.hall.characters;
export const START = "castle4";

// ?world=hall picks a world. ?r=20 overrides the radius. ?pad=x,y,z and ?door=x,y,z override spots.
export function worldFromQuery(key) {
  const q = new URLSearchParams(location.search);
  const w = { key, ...(WORLDS[key] || WORLDS[START]) };
  if (q.get("r")) w.radius = Number(q.get("r"));
  for (const k of ["pad", "door"]) if (q.get(k)) w[k] = q.get(k).split(",").map(Number);
  if (q.get("mode")) w.mode = q.get("mode");            // ?mode=walk to test on foot anywhere
  const qv = q.get("q") || import.meta.env.VITE_Q || ""; // ?q=500k for weak machines; VITE_Q=500k on the hosted build
  if (qv && w.url.endsWith(".spz")) w.url = w.url.replace(/\.spz$/, `-${qv}.spz`);
  w.q = qv;
  if (w.mode === "walk" && !w.characters) w.characters = WORLDS.hall.characters;
  return w;
}

// Measure the world's core: median distance from origin. Sky and far hills
// sit in the long tail and must not set the scale.
export function measureRadius(splat) {
  const d = [];
  let i = 0;
  splat.forEachSplat((_, center) => { if (i++ % 50 === 0) d.push(center.length()); });
  if (d.length < 100) return null;
  d.sort((a, b) => a - b);
  return d[Math.floor(d.length * 0.5)];
}

// Measure the floor: the lowest splats right under the camera. Centers come
// back in the splat's own frame, so apply the world quaternion first.
export function measureFloor(splat, R) {
  const ys = [];
  let i = 0;
  const v = new THREE.Vector3();
  splat.forEachSplat((_, center) => {
    if (i++ % 7 !== 0) return;
    v.copy(center).applyQuaternion(splat.quaternion);
    if (Math.hypot(v.x, v.z) < R * 0.35 && v.y < 0) ys.push(v.y);
  });
  if (ys.length < 50) return null;
  ys.sort((a, b) => a - b);
  return ys[Math.floor(ys.length * 0.04)];
}
