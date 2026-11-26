// Ridgeline Courier — deterministic screenshot poses. A URL like
// ?shot=play&seed=7 puts the game in a fixed state and steps the
// simulation a fixed number of frames, so every screenshot is the same
// on every machine. The game itself never reads the query in normal play.
import { CONFIG } from './config.js';
import { createAircraft, stepAircraft } from './aircraft.js';
import { startMission, checkRing } from './missions.js';

// Read ?shot=start|play|end and ?seed=N from the page URL.
export function readShotQuery() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const seed = Number(params.get('seed') || CONFIG.seed);
  return { shot, seed: Number.isFinite(seed) ? seed : CONFIG.seed };
}

// Build the exact game state a named shot wants. Returns a small record
// the main loop uses to pose the scene before the first frame.
export function poseShot(shot, world) {
  if (shot === 'start') {
    const plane = createAircraft(world);
    plane.throttle = 0.25;
    return { state: 'title', plane, mission: null, frames: 0 };
  }
  if (shot === 'play') {
    const mission = startMission(
      { id: 'ring-run', name: 'Ring Run', brief: '', rings: 6, wind: 4, fuel: 100, timeLimit: 0 },
      world,
      null,
    );
    const plane = createAircraft(world);
    plane.throttle = 0.8;
    // Fly a scripted climb-out with a tiny autopilot: full power, rotate,
    // climb to ring height, then steer for the next ring in order and stop
    // while it is dead ahead — the pose the cover shot wants. Rings flown
    // through are marked passed, as the game would; if the autopilot
    // misses one it keeps circling for it, and the pose still ends in a
    // good flying shot after 50 seconds.
    const dt = 1 / 60;
    for (let frame = 0; frame < 60 * 50; frame += 1) {
      const target = mission.rings[mission.nextRing] || mission.rings[mission.rings.length - 1];
      const dx = target.x - plane.x;
      const dy = target.y - plane.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const ahead = (Math.sin(plane.heading) * dx - Math.cos(plane.heading) * dy) / distance;
      if (plane.airborne && plane.altitude > 550 && distance < 400 && ahead > 0.5) break;
      checkRing(plane, mission);
      const desired = Math.atan2(dx, -dy);
      let error = desired - plane.heading;
      while (error > Math.PI) error -= Math.PI * 2;
      while (error < -Math.PI) error += Math.PI * 2;
      const roll = Math.max(-0.7, Math.min(0.7, error * 1.5));
      const pitch = !plane.airborne ? 0 : (plane.altitude < 750 ? 0.5 : 0.05);
      stepAircraft(plane, { roll, pitch, throttleDelta: 0 },
        world, { direction: 0.6, speed: 4 }, dt);
    }
    return { state: 'playing', plane, mission, frames: 0 };
  }
  if (shot === 'end') {
    const mission = startMission(
      { id: 'ring-run', name: 'Ring Run', brief: '', rings: 6, wind: 4, fuel: 100, timeLimit: 0 },
      world,
      null,
    );
    const plane = createAircraft(world);
    plane.throttle = 0.78;
    const dt = 1 / 60;
    for (let frame = 0; frame < 60 * 40; frame += 1) {
      const turning = frame > 60 * 10 && frame < 60 * 22;
      stepAircraft(plane, {
        roll: turning ? 0.5 : 0,
        pitch: frame < 60 * 5 ? 0.5 : 0.1,
        throttleDelta: 0,
      }, world, { direction: 0.6, speed: 4 }, dt);
    }
    // Pose the finish: all rings flown, gear down, on the home strip.
    mission.rings.forEach((ring) => { ring.passed = true; });
    mission.ringsPassed = mission.rings.length;
    mission.nextRing = mission.rings.length;
    mission.score = 2450;
    mission.finished = true;
    mission.result = 'Mission complete';
    mission.elapsed = 214;
    mission.detail = 'Landed clean in 3:34 — fuel 41% left, score 2450.';
    plane.x = world.homeRunway.x;
    plane.y = world.homeRunway.y;
    plane.heading = world.homeRunway.angle - Math.PI / 2;
    plane.altitude = 0;
    plane.speed = 24;
    plane.airborne = false;
    plane.onGround = true;
    plane.landed = true;
    plane.crashed = false;
    plane.fuel = 41;
    return { state: 'end', plane, mission, frames: 0 };
  }
  return null;
}
