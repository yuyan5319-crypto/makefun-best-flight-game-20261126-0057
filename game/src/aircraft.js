// Ridgeline Courier — the flight model: throttle, lift, stall, bank,
// climb and sink, fuel burn and damage. Plain numbers in, plain numbers
// out, so the renderer and the HUD never guess at the aeroplane.
import { CONFIG } from './config.js';
import { groundHeightAt, mountainAt, runwayAt } from './world.js';

// A fresh aeroplane parked on the home runway, engine idling.
export function createAircraft(world) {
  return {
    x: world.homeRunway.x,
    y: world.homeRunway.y + 40,
    heading: world.homeRunway.angle - Math.PI / 2,
    speed: 0,
    altitude: 0,
    verticalSpeed: 0, // feet per minute
    throttle: 0,
    pitch: 0, // -1 (full down) to +1 (full up)
    bank: 0,
    gearDown: true,
    flaps: false,
    fuel: 100,
    damage: 0,
    airborne: false,
    landed: false,
    crashed: false,
    crashReason: '',
    propAngle: 0,
    onGround: true,
  };
}

// One physics step. `controls` carries -1..1 axes and flags from input.js.
export function stepAircraft(plane, controls, world, wind, dt) {
  if (plane.crashed || plane.landed) return;

  // Throttle answers at every speed, on the ground and in the air.
  plane.throttle += controls.throttleDelta * dt;
  plane.throttle = Math.max(0, Math.min(1, plane.throttle));

  // Fuel: the tank drains with throttle, faster at full power.
  const burn = (CONFIG.fuelBurnCruise + (CONFIG.fuelBurnFull - CONFIG.fuelBurnCruise) * plane.throttle)
    * (plane.throttle > 0.02 ? 1 : 0.12);
  plane.fuel = Math.max(0, plane.fuel - burn * dt);
  if (plane.fuel <= 0) plane.throttle = 0;

  // Speed: thrust against drag, with a little help from a dive.
  const thrust = plane.throttle * CONFIG.throttleAccel;
  const drag = CONFIG.drag * plane.speed * plane.speed / 100;
  const diveHelp = -plane.pitch * 6;
  plane.speed += (thrust - drag + diveHelp) * dt;
  plane.speed = Math.max(0, Math.min(CONFIG.maxSpeed, plane.speed));

  // Bank follows the stick, then turns the aeroplane.
  const targetBank = controls.roll * CONFIG.maxBank;
  plane.bank += (targetBank - plane.bank) * Math.min(1, dt * 4);
  const turnRate = CONFIG.turnRate * Math.sin(plane.bank);
  plane.heading += turnRate * dt;

  // Pitch follows the stick; below stall speed the nose drops by itself.
  const stalled = plane.airborne && plane.speed < CONFIG.stallSpeed;
  const targetPitch = stalled ? -0.7 : controls.pitch;
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, dt * 3);

  // Vertical speed: climb with speed and pitch, sink when slow or idle.
  const liftSpeed = Math.max(0, plane.speed - 40);
  let climb = plane.pitch * CONFIG.climbRate * (liftSpeed / 90);
  if (stalled) climb = -CONFIG.sinkRate * 2.2;
  if (!plane.airborne && plane.speed < CONFIG.takeoffSpeed) climb = 0;
  plane.verticalSpeed = climb * 60;
  plane.altitude += climb * dt * 10;
  plane.altitude = Math.max(0, Math.min(CONFIG.maxAltitude, plane.altitude));

  // Wind pushes the aeroplane sideways, gently, in world space.
  const windX = Math.cos(wind.direction) * wind.speed * dt;
  const windY = Math.sin(wind.direction) * wind.speed * dt;

  // Move along the heading, in metres per second (knots to m/s).
  const metresPerSecond = plane.speed * 0.514;
  plane.x += Math.sin(plane.heading) * metresPerSecond * dt + windX;
  plane.y += -Math.cos(plane.heading) * metresPerSecond * dt + windY;
  plane.propAngle += dt * (4 + plane.throttle * 26);

  // Stay inside the valley: the ridge wall turns the aeroplane back.
  const half = world.half;
  if (plane.x < -half) { plane.x = -half; plane.heading = Math.abs(plane.heading); }
  if (plane.x > half) { plane.x = half; plane.heading = -Math.abs(plane.heading); }
  if (plane.y < -half) { plane.y = -half; plane.heading = Math.PI - plane.heading; }
  if (plane.y > half) { plane.y = half; plane.heading = Math.PI - plane.heading; }

  const ground = groundHeightAt(world, plane.x, plane.y);
  const runway = runwayAt(world, plane.x, plane.y);
  const mountain = mountainAt(world, plane.x, plane.y);

  // Mountains: flying into one below its peak is a crash.
  if (mountain && plane.altitude < mountain.height) {
    crashPlane(plane, 'Struck the ridge at ' + Math.round(plane.altitude) + ' ft');
    return;
  }

  // Takeoff: fast enough on the strip, or a field takeoff past the strip.
  if (!plane.airborne && plane.speed >= CONFIG.takeoffSpeed && plane.altitude <= 0) {
    plane.airborne = true;
    plane.onGround = false;
    plane.altitude = 2;
  }

  // Touchdown: only a runway counts as a landing, and only done gently.
  if (plane.airborne && plane.altitude <= 0) {
    plane.altitude = 0;
    const sink = -plane.verticalSpeed;
    const tooFast = plane.speed > CONFIG.landingMaxSpeed;
    const tooHard = sink > CONFIG.landingMaxSink;
    if (runway && !tooFast && !tooHard && plane.gearDown) {
      landPlane(plane);
    } else if (runway && !plane.gearDown) {
      crashPlane(plane, 'Belly landing — the gear was up');
    } else if (tooHard) {
      crashPlane(plane, 'Hard landing at ' + Math.round(sink) + ' fpm');
    } else if (tooFast) {
      crashPlane(plane, 'Ran off the strip at ' + Math.round(plane.speed) + ' kt');
    } else {
      // A rough field landing: survivable, but it bends the airframe.
      plane.damage += CONFIG.damageHardLanding;
      plane.speed = Math.max(0, plane.speed - 40);
      plane.airborne = false;
      plane.onGround = true;
      if (plane.damage >= 100) crashPlane(plane, 'Airframe broke up in the field');
    }
  }

  // Ground roll: friction and steering on the strip. Friction only
  // slows the aeroplane; it never zeroes a speed the engine is building.
  if (!plane.airborne && plane.altitude <= 0) {
    plane.speed = Math.max(0, plane.speed - 8 * dt);
    if (plane.speed < 0.5 && plane.throttle < 0.05) plane.speed = 0;
  }

  // Damage ends the sortie at 100%.
  if (plane.damage >= 100 && !plane.crashed) {
    crashPlane(plane, 'Airframe damage reached 100%');
  }

  // Out of fuel over the fields: the engine quits and the glide begins.
  if (plane.fuel <= 0 && plane.airborne && plane.speed < 40) {
    plane.verticalSpeed = -CONFIG.sinkRate * 60;
  }
}

export function crashPlane(plane, reason) {
  plane.crashed = true;
  plane.crashReason = reason;
  plane.speed = 0;
  plane.altitude = 0;
}

export function landPlane(plane) {
  plane.landed = true;
  plane.airborne = false;
  plane.onGround = true;
  plane.speed = Math.max(0, plane.speed - 30);
}

export function toggleGear(plane) {
  if (!plane.airborne) return;
  plane.gearDown = !plane.gearDown;
}

export function toggleFlaps(plane) {
  plane.flaps = !plane.flaps;
}
