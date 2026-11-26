// Ridgeline Courier — the valley itself: fields, forest, river, roads,
// a town, mountain ridges and two grass runways. Everything is generated
// from the seed, so the same seed always builds the same valley.
import { CONFIG } from './config.js';
import { makeRandom, randomRange, randomPick, makeNoiseField } from './random.js';

const FIELD_COLORS = [
  '#8fae5a', '#a8b45e', '#7fa653', '#c2b25e', '#93a95c',
  '#b59a4e', '#86a860', '#cbb465', '#9db06a', '#7d9c52',
];
const FOREST_COLOR = '#557a45';
const MEADOW_COLOR = '#79a05a';
const RIVER_COLOR = '#5d94b8';
const ROAD_COLOR = '#8a7a5c';

// Build the whole valley once. Returns the terrain record the renderer
// and the flight model read from.
export function buildWorld(seed) {
  const random = makeRandom(seed);
  const size = CONFIG.worldSize;
  const half = size / 2;
  const hills = makeNoiseField(seed + 11, 620);

  // Patchwork fields across the valley floor — dense enough that the
  // ground reads as farmland from the air, not bare meadow.
  const fields = [];
  const fieldCount = 230;
  for (let i = 0; i < fieldCount; i += 1) {
    const w = randomRange(random, 160, 460);
    const h = randomRange(random, 130, 380);
    fields.push({
      x: randomRange(random, -half, half - w),
      y: randomRange(random, -half, half - h),
      w,
      h,
      color: randomPick(random, FIELD_COLORS),
      angle: randomPick(random, [0, 0, 0, Math.PI / 2]),
    });
  }

  // Forest blobs, kept clear of the runways and sparse enough that the
  // valley reads as farmland with woods, not one dark mass.
  const forests = [];
  for (let i = 0; i < 18; i += 1) {
    const cx = randomRange(random, -half, half);
    const cy = randomRange(random, -half, half);
    if (Math.abs(cx) < 500 && Math.abs(cy) < 500) continue;
    if (Math.abs(cx - 2100) < 600 && Math.abs(cy - 1700) < 600) continue;
    forests.push({ x: cx, y: cy, r: randomRange(random, 60, 140) });
  }

  // A river winding from the north hills to the south lake.
  const river = [];
  let rx = randomRange(random, -900, 900);
  for (let y = -half - 200; y <= half + 200; y += 160) {
    rx += randomRange(random, -160, 160);
    river.push({ x: rx, y });
  }

  // Two dirt roads: one along the valley, one crossing to the far strip.
  const roads = [
    { x1: -half, y1: 240, x2: half, y2: 180 },
    { x1: 300, y1: -half, x2: 2100, y2: 1700 },
  ];

  // A small town beside the home runway: a cluster of rooftops.
  const town = [];
  for (let i = 0; i < 42; i += 1) {
    town.push({
      x: randomRange(random, -620, -180),
      y: randomRange(random, 420, 760),
      w: randomRange(random, 18, 42),
      h: randomRange(random, 16, 36),
      color: randomPick(random, ['#b5673f', '#8f5a46', '#a8815a', '#7a6a58']),
    });
  }

  // Mountain ridges: tall cones that hurt at low altitude.
  const mountains = [];
  const ridgeSpots = [
    [-2600, -2100, 420], [2600, -2300, 460], [-2400, 2200, 380],
    [2400, 2400, 400], [600, -2600, 430], [-900, 2600, 390],
    [2900, 200, 350], [-2900, -300, 360],
  ];
  for (const [mx, my, mr] of ridgeSpots) {
    mountains.push({ x: mx, y: my, r: mr, height: randomRange(random, 1500, 2600) });
  }

  // Home runway near the south-west, far strip to the north-east.
  const homeRunway = { x: 0, y: 0, angle: 0.12, length: CONFIG.runwayLength, width: CONFIG.runwayWidth };
  const farRunway = { x: 2100, y: 1700, angle: -0.5, length: 480, width: 40 };

  // Ring course: a winding line of rings from home toward the far strip.
  // The first ring sits far enough out that the aeroplane can take off,
  // climb and turn for it instead of overshooting it on the climb-out.
  const ringSpots = [];
  const ringCount = 8;
  for (let i = 0; i < ringCount; i += 1) {
    const t = (i + 1.5) / (ringCount + 1.5);
    const bx = 100 + t * 2000 + randomRange(random, -260, 260);
    const by = 60 + t * 1640 + randomRange(random, -260, 260);
    ringSpots.push({ x: bx, y: by, altitude: randomRange(random, 650, 1250) });
  }

  return {
    size, half, fields, forests, river, roads, town, mountains,
    homeRunway, farRunway, ringSpots, hills,
  };
}

// Height of the ground at a point, in feet, from the hill noise.
export function groundHeightAt(world, x, y) {
  return world.hills(x + world.half, y + world.half) * 900;
}

// The tallest mountain whose footprint contains the point, or null.
export function mountainAt(world, x, y) {
  for (const mountain of world.mountains) {
    const dx = x - mountain.x;
    const dy = y - mountain.y;
    if (dx * dx + dy * dy < mountain.r * mountain.r) return mountain;
  }
  return null;
}

// Is the point over a runway strip (either one)?
export function runwayAt(world, x, y) {
  for (const runway of [world.homeRunway, world.farRunway]) {
    const cos = Math.cos(-runway.angle);
    const sin = Math.sin(-runway.angle);
    const dx = x - runway.x;
    const dy = y - runway.y;
    const along = dx * cos - dy * sin;
    const across = dx * sin + dy * cos;
    if (Math.abs(along) <= runway.length / 2 && Math.abs(across) <= runway.width / 2) {
      return runway;
    }
  }
  return null;
}

// Rotate a world point into screen space around the camera centre.
// The camera sits behind the plane and the world turns under it.
export function worldToScreen(point, camera, canvasWidth, canvasHeight, scale) {
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;
  const cos = Math.cos(camera.heading);
  const sin = Math.sin(camera.heading);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return {
    x: canvasWidth / 2 + rx / scale,
    y: canvasHeight * 0.52 + ry / scale,
  };
}
