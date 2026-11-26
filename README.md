[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/yuyan5319-crypto/makefun-best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/yuyan5319-crypto/makefun-best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Ridgeline Courier

A bush-plane flight game: fly a little red high-wing courier over a patchwork valley, thread the glowing rings in order, and bring her down gently on a grass strip — with fuel and airframe damage turning every sortie into decisions.

## What it is

You are the valley's courier pilot. The camera rides behind your aeroplane while the world turns underneath: fields, forest, a winding river, a little town, mountain ridges and two grass runways. Three sorties to choose from:

- **Ring Run** — thread all six valley rings in order, then land home.
- **Valley Delivery** — carry a parcel over the ridge: three rings, then land on the far strip.
- **Storm Patrol** — eight rings in a crosswind, on a tight tank, against the clock.

Flying rewards discipline: throttle sets your speed, banking turns you but bleeds speed, climbing costs speed and stalling drops the nose. Fuel burns with throttle, mountains hurt below their peaks, and a landing only counts if it is gentle, slow, gear-down and on a strip. Land hard, fast, or gear-up and the valley keeps the aeroplane.

## How to play

Serve the game and open it in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

| Control | What it does |
| --- | --- |
| ← → or A / D | Bank and turn |
| ↑ ↓ or W / S | Pitch up / down (climb / descend) |
| Shift | Full throttle |
| C | Cut throttle |
| G | Raise / lower the gear |
| F | Flaps on / off |
| Mouse | Hold the pointer off-centre to steer; wheel trims throttle |
| P | Pause · R restart · M mission list · 1 / 2 / 3 pick a sortie |

The HUD shows airspeed, altitude and vertical speed, a heading compass, fuel and airframe bars, throttle, wind and a minimap. Fly through a ring at the right altitude to score; the next ring glows amber and the minimap marks it.

Screenshots are deterministic: `?shot=start`, `?shot=play` and `?shot=end` (with `&seed=7`) pose the game for its cover shots.

## Layout

- `game/index.html` — the page, one canvas.
- `game/src/main.js` — the game loop and state machine.
- `game/src/config.js` — tuning constants and the mission list.
- `game/src/world.js` — the valley: terrain generation and the camera transform.
- `game/src/aircraft.js` — the flight model: lift, stall, fuel, damage, landings.
- `game/src/input.js` — keyboard and mouse.
- `game/src/render.js` — the scene: ground, runways, rings, aeroplane, clouds.
- `game/src/hud.js` — instruments, minimap, menus and end screens.
- `game/src/missions.js` — sorties, objectives and scoring.
- `game/src/audio.js` — synthesised sounds (WebAudio, no audio files).
- `game/src/shots.js` — deterministic `?shot=` poses.
- `game/src/random.js` — seeded random numbers and hill noise.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.
- `serve.ts` — a tiny static server for local play.

Everything runs offline from static files; the game makes no network requests. Licensed MIT.
