// Ridgeline Courier — the three sorties. Each mission hands the pilot a
// different job: rings in order, a parcel to the far strip, or a patrol
// against the clock. Progress, scoring and the win/lose call live here.
import { CONFIG } from './config.js';

// Start a mission: pick its rings from the world, reset the clock.
export function startMission(mission, world, plane) {
  const rings = world.ringSpots.slice(0, mission.rings).map((spot, index) => ({
    x: spot.x,
    y: spot.y,
    altitude: spot.altitude,
    index,
    passed: false,
  }));
  return {
    mission,
    rings,
    nextRing: 0,
    ringsPassed: 0,
    startedAt: performance.now(),
    elapsed: 0,
    score: 0,
    finished: false,
    result: '',
    detail: '',
  };
}

// Has the aeroplane flown through the next ring? Rings are hoops in the
// sky: close in plan and within 260 ft of the ring's altitude.
export function checkRing(plane, state) {
  const ring = state.rings[state.nextRing];
  if (!ring) return false;
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  const planDistance = Math.sqrt(dx * dx + dy * dy);
  const altGap = Math.abs(plane.altitude - ring.altitude);
  if (planDistance < CONFIG.ringRadius && altGap < 260) {
    ring.passed = true;
    state.ringsPassed += 1;
    state.nextRing += 1;
    state.score += 250 + Math.round(plane.fuel);
    return true;
  }
  return false;
}

// What the pilot still has to do, in one line for the HUD.
export function missionObjective(state, plane) {
  if (state.finished) return state.result;
  const ring = state.rings[state.nextRing];
  if (ring) {
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
    return 'Ring ' + (state.nextRing + 1) + ' of ' + state.rings.length
      + ' — ' + distance + ' m ahead, ' + Math.round(ring.altitude) + ' ft';
  }
  return state.mission.id === 'valley-delivery'
    ? 'Parcel aboard — land on the far strip'
    : 'All rings flown — land on the home strip';
}

// The win/lose call, made when the aeroplane lands or crashes.
export function finishMission(state, plane, world) {
  if (state.finished) return;
  state.finished = true;
  state.elapsed = (performance.now() - state.startedAt) / 1000;
  if (plane.crashed) {
    state.result = 'Sortie lost';
    state.detail = plane.crashReason + ' — ' + state.ringsPassed + ' of '
      + state.rings.length + ' rings flown.';
    return;
  }
  if (plane.landed) {
    const allRings = state.ringsPassed === state.rings.length;
    const home = world.homeRunway;
    const dx = plane.x - home.x;
    const dy = plane.y - home.y;
    const homeLanding = Math.sqrt(dx * dx + dy * dy) < home.length;
    const far = world.farRunway;
    const fx = plane.x - far.x;
    const fy = plane.y - far.y;
    const farLanding = Math.sqrt(fx * fx + fy * fy) < far.length;
    const rightStrip = state.mission.id === 'valley-delivery' ? farLanding : homeLanding;
    if (allRings && rightStrip) {
      const timeBonus = Math.max(0, 1200 - Math.round(state.elapsed * 4));
      const fuelBonus = Math.round(plane.fuel * 6);
      const softBonus = plane.damage === 0 ? 300 : 0;
      state.score += timeBonus + fuelBonus + softBonus;
      state.result = 'Mission complete';
      state.detail = 'Landed clean in ' + formatTime(state.elapsed)
        + ' — fuel ' + Math.round(plane.fuel) + '% left, score ' + state.score + '.';
    } else if (!allRings) {
      state.result = 'Landed short';
      state.detail = 'Only ' + state.ringsPassed + ' of ' + state.rings.length
        + ' rings flown before landing.';
    } else {
      state.result = 'Wrong strip';
      state.detail = 'All rings flown, but this is the wrong runway for the job.';
    }
    return;
  }
  state.result = 'Sortie over';
  state.detail = state.ringsPassed + ' of ' + state.rings.length + ' rings flown.';
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes + ':' + String(rest).padStart(2, '0');
}
