// Ridgeline Courier — tuning constants for the whole game.
// One place for every number a pilot would argue about: speeds in knots,
// altitudes in feet, distances in world metres, fuel in percent.
export const CONFIG = {
  // World
  worldSize: 6400,
  seed: 7,

  // Flight model
  minSpeed: 0,
  maxSpeed: 210,
  stallSpeed: 58,
  cruiseSpeed: 130,
  takeoffSpeed: 62,
  maxAltitude: 4200,
  climbRate: 9.5,
  sinkRate: 6.0,
  turnRate: 0.9, // radians per second at full bank
  maxBank: 0.85, // radians of visual bank
  drag: 0.12,
  throttleAccel: 26,

  // Fuel and damage
  fuelCapacity: 100,
  fuelBurnCruise: 0.55, // percent per second at 70% throttle
  fuelBurnFull: 1.15,
  damageMountain: 34,
  damageHardLanding: 40,
  damageGearUp: 100,

  // Landing
  landingMaxSpeed: 95,
  landingMaxSink: 520, // feet per minute of vertical speed
  runwayLength: 560,
  runwayWidth: 46,

  // Rings
  ringRadius: 95,
  ringAltitude: 900,

  // Camera and view
  viewScale: 0.62, // world metres per screen pixel at zoom 1
  shadowOffset: 26,
};

// Mission list: id, name, short brief, ring count, wind, fuel start.
export const MISSIONS = [
  {
    id: 'ring-run',
    name: 'Ring Run',
    brief: 'Thread all six valley rings in order, then bring her home.',
    rings: 6,
    wind: 4,
    fuel: 100,
    timeLimit: 0,
  },
  {
    id: 'valley-delivery',
    name: 'Valley Delivery',
    brief: 'Carry the parcel over the ridge. Three rings, then land on the far strip.',
    rings: 3,
    wind: 9,
    fuel: 100,
    timeLimit: 0,
  },
  {
    id: 'storm-patrol',
    name: 'Storm Patrol',
    brief: 'Eight rings in a crosswind, on a tight tank. Mind the gusts.',
    rings: 8,
    wind: 18,
    fuel: 78,
    timeLimit: 360,
  },
];
