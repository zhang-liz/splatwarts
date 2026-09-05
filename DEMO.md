# Splatwarts — 2-minute demo

Track: Gaming & Interactive Worlds. Loop: fly, land, walk, talk, cast, walk out into Diagon Alley.

## Before going on stage
- `npm run dev` running. Open `http://localhost:5173/` in Chrome. Mic allowed.
- Click once (pointer lock + music). Press V (voice spells on).
- Fallback recording on the desktop, ready to play.

## 0:00 State it
Let the title sit for 3 seconds: the camera is already pushing toward the castle.
"Splatwarts. A wizard school you can fly around, land in, walk through, and talk to. Every world is a Gaussian splat from Marble, built from photos of the real film miniature and the real sets."

## 0:15 Fly
Press W. Fly through 3 rings. Say "the rings are placed from the world's own measured size, so any Marble world becomes a course."

## 0:40 Land
Dive to the blue pad. Fade. "Two worlds, one landing."

## 0:50 Talk
Look up: floating candles. Walk to Dumbledore. Press E. Say: "Professor, what should I never do in this hall?"
He answers in his own voice. "The characters are Tripo image-to-3D models, rigged in Tripo. The voice is Claude answering in character, spoken by ElevenLabs."

## 1:20 Cast
Turn to the wall. Say "Lumos." The stone lights up. "That is not a light. Spark is editing the splats themselves in a sphere around the wand."
Say "Reducto." Hole in the wall, debris, heals. Say "Expecto Patronum" down the hall: the stag runs between the tables.

## 1:35 Photo
Press C. Webcam preview, "With: Harry" already picked. Press Space. 3-2-1. Ten seconds later: you and Harry, side by side in the Great Hall, lit by the candles, live-action look. "That is Seedream compositing my webcam and a photoreal Harry into the live frame." Click Save. (Upload a photo works instead of the webcam; the picker also offers Hermione and Dumbledore, or nobody.)

## 1:45 Out into the alley
Walk through the orange door at the far end. Fade. Diagon Alley at night, shop windows glowing. Say "Lumos" once on the cobbles. "Third world, same pipeline: one photo of the set, cleaned up with Seedream, into Marble." The orange pad here takes you back to the broom.

## 1:45 Roles
- World Labs Marble 1.1 Plus: all three worlds, image-prompted from free-license photos of the film's model and sets, cleaned up with Seedream (tourists, railings, studio ceilings removed).
- Spark 2: splat rendering and the live splat edits behind Lumos and Reducto.
- Tripo: broom, Patronus stag, and the three characters (rigged on Meshy, posed live).
- Mint: asset pack for set dressing (if landed) / concept-to-3D.
- Convex: leaderboard (if landed).
- Claude + ElevenLabs via FAL: dialogue and voices. Seedream via FAL: photo cleanup and T-pose concept sheets. Stable Audio: music and spell sounds.

## 1:55 Close
"Built today. Reset is R. Go fly it."

## If something breaks
- Any world: `?world=castle3`, `?world=hall3`, `?world=alley` in the URL. Add `&q=500k` on a weak laptop, `&flat=1` to drop the film look.
- Talk box stuck: click the scene or the Walk away button.
- Photo mode: needs camera permission once. `&robes=1` in the URL dresses you in Hogwarts robes.

## Keys
Fly: mouse steer, W fly, Shift boost, Space stop, R restart. Walk: WASD, E talk, Esc leave. C photo anywhere. Spells: V voice toggle, 1 Lumos, 2 Incendio, 3 Patronum, 4 Expelliarmus, 5 Leviosa, 6 Reducto, 0 Nox. P prints your position.
