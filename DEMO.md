# Splatwarts — 2-minute demo

Track: Creative 3D & VFX. Pitch: one photo of a film set becomes a walkable 3D set with a cinema lens, and a real person can be composited into any shot in ten seconds.

## Before going on stage
- `npm run dev` running. Open `http://localhost:5173/` in Chrome. Camera and mic allowed.
- Have your own photo ready in a folder (or use the webcam).
- Fallback recording on the desktop, ready to play.

## 0:00 State it
Let the title sit for 3 seconds: the camera is already pushing toward the castle.
"Splatwarts. Virtual production from one photograph. This castle is a photo of the film miniature. Marble turned it into a 3D set. Everything you see is a Gaussian splat with a cinema lens on it."

## 0:15 Camera move
Press W. One smooth pass around the castle, through a ring or two, no racing.
"This is a camera move through the set, not a video. Any Marble world becomes a set you can shoot from any angle."

## 0:40 Cut to the hall
Dive to the blue pad. Fade. Look up.
"The Great Hall, from a photo of the real set. The floating candles, the depth of field, the bloom and the film grade are all live. Spark renders the splats, Three.js does the lens."

## 0:55 Set dressing, live
Turn to the wall. Say "Lumos." Say "Reducto." Hole in the wall, debris, heals.
"Those are edits to the splats themselves, in a sphere around the wand. Set dressing you can change on stage."

## 1:05 The shot (hero moment)
Press C. Webcam preview, "With: Harry" already picked. Press Space. 3-2-1.
"Now the part a VFX supervisor cares about. The live frame, my webcam, and a photoreal reference of Harry go to Seedream."
Ten seconds later: you and Harry, side by side in the Great Hall, lit by the candles, live-action look.
"Matched lighting, shadows, depth of field, grain. Ten seconds. No green screen, no roto."
Click Another, pick Upload a photo, choose your own picture, take it again with Hermione if time allows.

## 1:40 Second set
Walk through the orange door at the far end. Fade. Diagon Alley at night.
"Second set, same pipeline: one photo of the set, cleaned with Seedream, sharpened as a panorama, into Marble. Twelve minutes from photo to walkable."

## 1:50 Roles
- World Labs Marble 1.1 Plus: all three sets, image and panorama prompted from free-license photos of the film's model and sets, cleaned up and enhanced with Seedream.
- Spark 2: splat rendering, depth of field, and the live splat edits behind Lumos and Reducto.
- Three.js post: bloom, film grade, vignette.
- Seedream via FAL: set cleanup, panorama enhancement, and the composite that puts a real person into the shot.
- Tripo: broom, Patronus stag, and three characters as extras. Claude + ElevenLabs via FAL: the extras talk (press E). Stable Audio: music, ambience, spell sounds.

## 1:55 Close
"Built today. Any set you can photograph, you can walk and shoot in. Go take a picture."

## If something breaks
- Any world: `?world=castle4`, `?world=hall4`, `?world=alley2` in the URL (the older, softer `castle3`, `hall3`, `alley` still work). Add `&q=500k` on a weak laptop, `&flat=1` to drop the film look.
- Photo mode: needs camera permission once. Upload a photo works without a camera. `&robes=1` dresses you in Hogwarts robes.
- Talk box stuck: click the scene or the Walk away button.

## Keys
Fly: mouse steer, W fly, Shift boost, Space stop, R restart. Walk: WASD, E talk, Esc leave. C photo anywhere. H cinema mode (no HUD, letterbox) for recording. Scene map bottom-left: press Esc to free the cursor, click a set to jump there. [ and ] also cycle the sets. Spells: V voice toggle, 1 Lumos, 2 Incendio, 3 Patronum, 4 Expelliarmus, 5 Leviosa, 6 Reducto, 0 Nox. P prints your position.
