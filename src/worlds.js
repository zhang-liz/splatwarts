// Worlds. A Marble world is a bubble seen from its center, so play stays
// inside `radius` (world units, auto-measured when null).
// mode: "fly" = broom race with rings and a landing pad. "walk" = on foot with characters.
export const WORLDS = {
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
    door: null,             // [x,y,z] exit portal. null = behind spawn. ?door=x,y,z overrides
    next: "castle2",
    characters: [
      { name: "Harry", file: "/characters/harry.glb", pos: [-0.35, 0.28, -0.75], yaw: 0.3,
        persona: "You are Harry Potter, 15, brave, a little awkward, loyal. You are in the Great Hall at Hogwarts." },
      { name: "Hermione", file: "/characters/hermione.glb", pos: [0.35, 0.28, -0.85], yaw: -0.3,
        persona: "You are Hermione Granger, 15, brilliant, precise, kind but quick to correct people. You are in the Great Hall at Hogwarts." },
      { name: "Dumbledore", file: "/characters/dumbledore.glb", pos: [0, 0.28, -1.6], yaw: 0,
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

export const START = "castle2";

// ?world=hall picks a world. ?r=20 overrides the radius. ?pad=x,y,z and ?door=x,y,z override spots.
export function worldFromQuery(key) {
  const q = new URLSearchParams(location.search);
  const w = { key, ...(WORLDS[key] || WORLDS[START]) };
  if (q.get("r")) w.radius = Number(q.get("r"));
  for (const k of ["pad", "door"]) if (q.get(k)) w[k] = q.get(k).split(",").map(Number);
  return w;
}

// Measure how big the loaded splat is: 70th percentile distance from origin.
export function measureRadius(splat) {
  const d = [];
  let i = 0;
  splat.forEachSplat((_, center) => { if (i++ % 50 === 0) d.push(center.length()); });
  if (d.length < 100) return null;
  d.sort((a, b) => a - b);
  return d[Math.floor(d.length * 0.7)];
}
