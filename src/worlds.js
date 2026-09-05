// Worlds you can fly in. Add your own Marble export here.
// .rad = streaming LOD (paged: true). .spz = normal load (paged: false).
export const WORLDS = {
  hobbiton: {
    name: "Hobbiton",
    url: "https://storage.googleapis.com/forge-dev-public/asundqui/rad/260219/tijerin_w6_hobbiton-lod.rad",
    paged: true,
    quaternion: [1, 0, 0, 0],
    position: [0, 0, 0],
    scale: 1,
    background: "#cafefe",
    // Where the broom starts. Press P in game to print a good spawn.
    spawn: { position: [0, 2, 0], yaw: 0, pitch: 0 },
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
    spawn: { position: [0, 2, 0], yaw: 0, pitch: 0 },
    credit: "6M splats by Britt Casado with World Labs Marble",
  },
  // Your Marble castle. Drop the .spz in public/worlds/ and set url: "/worlds/castle.spz"
  castle: {
    name: "Castle",
    url: "/worlds/castle.spz",
    paged: false,
    quaternion: [1, 0, 0, 0],
    position: [0, 0, 0],
    scale: 1,
    background: "#1a1633",
    spawn: { position: [0, 2, 0], yaw: 0, pitch: 0 },
    credit: "Made with World Labs Marble",
  },
};

// ?world=spaceship in the URL picks a world. Default below.
export function pickWorld() {
  const key = new URLSearchParams(location.search).get("world") || "hobbiton";
  return WORLDS[key] || WORLDS.hobbiton;
}
