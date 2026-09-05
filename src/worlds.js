// Worlds you can fly in. A Marble world is a bubble seen from its center,
// so flight stays inside `radius` (world units, auto-measured when possible).
export const WORLDS = {
  castle: {
    name: "Castle",
    url: "/worlds/castle.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    position: [0, 0, 0],
    scale: 1,
    background: "#141222",
    radius: null,        // null = measure from the splat after load
    credit: "Made with World Labs Marble",
  },
  hobbiton: {
    name: "Hobbiton",
    url: "https://storage.googleapis.com/forge-dev-public/asundqui/rad/260219/tijerin_w6_hobbiton-lod.rad",
    paged: true,
    quaternion: [1, 0, 0, 0],
    position: [0, 0, 0],
    scale: 1,
    background: "#cafefe",
    radius: 12,          // streamed worlds cannot be measured up front
    credit: "24M splats by Tijerin with World Labs Marble",
  },
  spaceship: {
    name: "Cozy Spaceship",
    url: "https://storage.googleapis.com/forge-dev-public/asundqui/rad/260217/cozy-spaceship_2-lod.rad",
    paged: true,
    quaternion: [0, 0, 0, 1],
    position: [0, -6.5, 0],
    scale: 1,
    background: "#000000",
    radius: 8,
    credit: "6M splats by Britt Casado with World Labs Marble",
  },
};

// ?world=hobbiton picks a world. ?r=20 overrides the flight radius.
export function pickWorld() {
  const q = new URLSearchParams(location.search);
  const w = { ...(WORLDS[q.get("world")] || WORLDS.castle) };
  if (q.get("r")) w.radius = Number(q.get("r"));
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
