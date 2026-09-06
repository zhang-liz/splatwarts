# Splatwarts

Virtual production from one photograph. A photo of a film set becomes a walkable Gaussian-splat set with a cinema lens, film grade and floating candles; press C and a real person is composited into the shot in about ten seconds. Fly a broom around the castle, walk the Great Hall and Diagon Alley, edit the set with spells.
Built for the Spatial Intelligence + Generative 3D Hackathon, 2026-09-05. Track: Creative 3D & VFX.

Tech: World Labs Marble 1.1 Plus (sets from photos and enhanced panoramas of the film's model and sets), Spark 2 (rendering, depth of field, live splat edits for Lumos and Reducto), Three.js post (bloom, grade, vignette), Seedream via FAL (set cleanup, panorama enhancement, the photo composite), Tripo (broom, stag, characters), Claude and ElevenLabs via FAL (the characters talk), Stable Audio (music, ambience, spell sounds).

See `DEMO.md` for the 2-minute stage script. `samples/photo-great-hall.jpg` is a photo-mode result: an uploaded portrait plus Harry, composited into the live Great Hall frame.

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

## Photo mode
Press C in any world. Webcam preview (or "Upload a photo"), pick who stands with you (Harry, Hermione, Dumbledore, nobody), press Space. The current game frame (wand and 3D figures hidden), your photo, and a photoreal portrait of the companion (`public/characters/photo/`) go to Seedream edit through the dev-server proxy `/api/edit`; about ten seconds later you get a live-action film still of you in the scene. `?robes=1` dresses you in Hogwarts robes. `?flat=1` turns off the film look (bloom, grade, vignette). H toggles cinema mode: HUD off, 2.39:1 letterbox, for recording. [ and ] jump between the three sets. Photo mode composites onto the set's enhanced panorama, cropped at your current view, so the backdrop is photoreal; the live splat frame is the fallback. H toggles cinema mode: HUD off, 2.39:1 letterbox, for recording.

## Scripts
- `scripts/marble_from_pano.sh <name> <pano.png> "<world prompt>"` — enhance a Marble panorama with Seedream at 4096x2048, then regenerate the world from it as a panorama prompt (Marble's highest-control input). Use this to sharpen a world.
- `scripts/marble_from_edit.sh <name> <photo> "<edit prompt>" "<world prompt>"` — clean a real photo with Seedream edit (tourists, railings out), then Marble Plus. Diagon Alley came from this.
- `scripts/fal_character.sh <name> <concept.png> [height] [anim]` — Tripo H3.1 image-to-3D on FAL, then Meshy rig. `scripts/fal_rig.sh` / `fal_rig_retry.sh` re-rig with another Meshy clip. `scripts/shrink_glb.sh in out [ratio]` cuts 80 MB exports to under 10 MB.
- `scripts/marble_from_url.sh <name> <image url> "<prompt>"` — Marble Plus world from a photo.
- `scripts/marble_from_image.sh <name> "<image prompt>" "<world prompt>"` — Seedream image, then Marble.
- `scripts/tripo_generate.sh <name> "<prompt>"` — Tripo text-to-model (API credits needed).
- `scripts/mint_character.sh <name> "<prompt>"` — Mint model, rig, animate (API key needed).

## Spells
V toggles voice. Say the spell or press 1-6, 0 for Nox. Lumos and Reducto edit the splats through Spark's SDF edits.
