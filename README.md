# Splatwarts

Broom flight through a ring course inside a Gaussian splat world.
Built for the Spatial Intelligence + Generative 3D Hackathon, 2026-09-05.

Tech: World Labs Marble (worlds), Spark 2 (splat renderer), Three.js, Tripo (broom, rings), Convex (leaderboard, later).

## Run

```
npm install
npm run dev
```

Open the printed URL. Click to mount the broom.

Controls: mouse steers, W/S speed, Shift boost, Space brake, R restart, P prints your position to the console.

## Swap the world

Edit `src/worlds.js`. `?world=spaceship` in the URL picks a world.
Drop a Marble `.spz` in `public/worlds/` and point a world entry at `/worlds/name.spz` with `paged: false`.
`.rad` files stream with `paged: true`.

## Place the rings

Fly to where a ring should go, press P, copy the `ring:` line into `HAND_COURSE` in `src/course.js`.

## Tripo broom

Export a `.glb` from Tripo and save it as `public/models/broom.glb`. It loads automatically.
