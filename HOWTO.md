# How to build your own Splatwarts

Step by step, from one photo of a set to a walkable world you can shoot yourself in.
Everything here was done in one day on a laptop. Each step names the tool, the script, and what to check.

## 0. What you need

- Node 20 or newer. `npm install` in this folder.
- A World Labs Marble API key (worlds) and a FAL API key (Seedream, Nano Banana, Tripo, Meshy, Claude, ElevenLabs, Stable Audio, upscaling). A Tripo key is optional.
- Put them in `.env`, one per line, never in git:

```
worldlabs-api-key=...
fal-api-key=...
tripo-api-key=...
```

- `npm run dev` and open the printed URL. The dev server proxies every `/api/*` call to FAL with your key, so the browser never sees it.

## 1. Find a photo of the set

Use photos you are allowed to use: free-license photos of a film set, a studio tour, a model, or your own place.
One photo is enough. Pick a wide, level shot with the floor visible and no people in the middle.

## 2. Clean the photo and make the first world

`scripts/marble_from_edit.sh <name> <photo> "<edit prompt>" "<world prompt>"`

- The edit prompt tells Seedream what to remove and restore: "remove the tourists and railings, restore the set as it looks on film".
- The world prompt tells Marble what the place is: "a cobbled magical shopping street at dusk, warm lamplight, photoreal film set".
- Output lands in `public/worlds/<name>.spz` (full), `<name>-500k.spz` (light), `<name>-collider.glb`, `<name>-pano.png`.
- Takes about 10 minutes. Check `<name>-pano.png`: if the layout is right, keep going.

## 3. Sharpen it: panorama in, better world out

This is the step that made the biggest difference.

`scripts/marble_from_pano.sh <name2> public/worlds/<name>-pano.png "<world prompt>"`

- Seedream enhances Marble's own panorama at 4096 x 2048 (more detail, same layout), saved as `<name2>-ref.png`.
- That panorama goes back into Marble as a panorama prompt, Marble's highest-control input.
- Result: a much crisper world. Compare `<name>` and `<name2>` in the app with `?world=<name>`.

## 4. Register the world

Add an entry to `src/worlds.js`, copying `hall4` (walk) or `castle4` (fly):

- `url`: `/worlds/<name2>.spz`. `photoPrompt`: one line describing the place, used by photo mode.
- `mode`: `"walk"` for rooms and streets, `"fly"` for landscapes. `radius`, `floor`, `door`, `pad`: leave `null`, they are measured from the splat.
- `next`: which world the door or landing pad leads to. `credit`: shown top-left.
- Add a thumbnail for the scene map: crop the centre of `<name2>-ref.png` to `public/worlds/thumbs/<name2>.jpg`, and add a button in `index.html` under `#map`.

Open `?world=<name2>` and walk. If the floor is wrong, press P to print your position and set `floor` by hand. Same for `door` and `pad`.

## 5. Lens and look

Already on: cinema field of view, depth of field (`src/main.js`), bloom, grade and vignette (`src/post.js`), floating candles (`src/candles.js`, set `candles: true` on the world).
`?flat=1` turns the look off if a laptop struggles. H toggles letterbox for recording.

## 6. Props from Tripo

`scripts/fal_character.sh <name> <concept.png> [height]` runs Tripo image-to-3D on FAL and a Meshy rig.
For props without a rig use `scripts/fal_model.sh`. Always shrink: `scripts/shrink_glb.sh in.glb out.glb 0.12` takes 85 MB to 9 MB.
Drop the file in `public/models/` (broom, stag) or `public/characters/`.

Lesson learned: Meshy's motion presets did not suit robed characters and its pose estimation failed on most re-rigs. The characters ship hidden (`?chars=1` shows them) with a procedural idle. A proper idle clip retargeted from Mixamo is the next step.

## 7. Photo mode

Press C in any world. What happens, in `src/photo.js`:

1. The set behind you is the enhanced panorama, rendered through a camera that copies your view, so the backdrop is photoreal.
2. Your webcam frame (or an uploaded photo) and a photoreal portrait of the companion (`public/characters/photo/`) go to Nano Banana with a prompt that insists on a re-rendered standing pose, robes, and the set's light.
3. The photo shows in about 15 seconds. A 4x upscale runs in the background and swaps in when ready. Seedream is the fallback.

Companion portraits were made with Seedream text-to-image: describe the character, not an actor.
`?plain=1` keeps your own clothes. `?fast=1` skips the upscale.

## 8. Voices, dialogue, sound

- Dialogue: `/api/llm` (Claude through FAL) with a short character card per person, in `src/dialogue.js`.
- Voices: `/api/tts` (ElevenLabs through FAL).
- Music and ambience: Stable Audio through FAL, 30 second loops, saved in `public/audio/` and set per world with `ambience:`.

## 9. Share it

Fastest: keep `npm run dev` running and open a tunnel, then send the link.

```
npx -y cloudflared tunnel --url http://localhost:5173
```

Permanent: import the repo on Vercel, set `FAL_KEY` and `VITE_Q=500k`, deploy. The `api/` folder holds the same proxies as serverless functions and `vercel.json` trims the build to the light splats.

## 10. Things that bit us

- Marble's `is_pano` must be a JSON boolean, not the string `"true"`.
- Spark writes sRGB by default; under a post-processing composer set `encodeLinear: true` or colours wash out.
- After swapping a splat under the composer, call `spark.update({ scene, camera })` a few times or the old world lingers.
- Every transparent effect needs a `renderOrder` above the splat mesh or it draws behind the world.
- A hidden Chrome tab pauses the render loop. Test in a visible tab before calling something a bug.
