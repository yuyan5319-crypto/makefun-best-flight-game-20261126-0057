// Seeded random numbers, so the valley, the weather and the screenshot
// poses are the same every time the game loads with the same seed.

// mulberry32: a small, fast, well-behaved seeded generator.
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick a value in [min, max) from a seeded generator.
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

// Pick one item from an array with a seeded generator.
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}

// A tiny 2D value-noise field, built from a seeded grid, for rolling hills.
export function makeNoiseField(seed, cellSize) {
  const random = makeRandom(seed);
  const grid = new Map();
  function gridValue(gx, gy) {
    const key = gx + ',' + gy;
    if (!grid.has(key)) grid.set(key, random());
    return grid.get(key);
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }
  return function noiseAt(x, y) {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    const fx = smooth(x / cellSize - gx);
    const fy = smooth(y / cellSize - gy);
    const a = gridValue(gx, gy);
    const b = gridValue(gx + 1, gy);
    const c = gridValue(gx, gy + 1);
    const d = gridValue(gx + 1, gy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}
