# Splatwarts

Fly a broom around Hogwarts, land, walk into the Great Hall, talk to the characters, and cast spells by voice. Every world is a Gaussian splat.
Built for the Spatial Intelligence + Generative 3D Hackathon, 2026-09-05.

Tech: World Labs Marble 1.1 Plus (worlds from photos of the film's model and set), Spark 2 (rendering and live splat edits for Lumos and Reducto), Three.js, Tripo (characters and broom), FAL (Seedream photo cleanup, Claude dialogue, ElevenLabs voices, Stable Audio music and spell sounds).

See `DEMO.md` for the 2-minute stage script.

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

## Keys in `.env`
`worldlabs-api-key`, `fal-api-key`, `tripo-api-key`, `mint-api-key`. One per line, `name=value`. The dev server proxies `/api/llm` and `/api/tts` to FAL so keys never reach the browser.

## Scripts
- `scripts/marble_from_url.sh <name> <image url> "<prompt>"` — Marble Plus world from a photo.
- `scripts/marble_from_image.sh <name> "<image prompt>" "<world prompt>"` — Seedream image, then Marble.
- `scripts/tripo_generate.sh <name> "<prompt>"` — Tripo text-to-model (API credits needed).
- `scripts/mint_character.sh <name> "<prompt>"` — Mint model, rig, animate (API key needed).

## Spells
V toggles voice. Say the spell or press 1-6, 0 for Nox. Lumos and Reducto edit the splats through Spark's SDF edits.
