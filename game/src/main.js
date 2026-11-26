// Ridgeline Courier — the game loop: states, timing, input, physics,
// missions and drawing, wired together. This is the only file the page
// loads; everything else is imported from here.
import { CONFIG, MISSIONS } from './config.js';
import { buildWorld } from './world.js';
import { createAircraft, stepAircraft, toggleGear, toggleFlaps } from './aircraft.js';
import { createInput, readControls, clearPresses } from './input.js';
import { drawScene, makeClouds } from './render.js';
import { drawHud, drawTitle, drawPause, drawEnd } from './hud.js';
import { startMission, checkRing, finishMission } from './missions.js';
import { createAudio } from './audio.js';
import { readShotQuery, poseShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const seed = readShotQuery()?.seed ?? CONFIG.seed;
const world = buildWorld(seed);
const input = createInput(canvas);
const audio = createAudio();
const clouds = makeClouds(seed);

const wind = { direction: 0.6, speed: 4 };
const game = {
  state: 'title',
  plane: createAircraft(world),
  mission: null,
  missionIndex: 0,
  messages: [],
  time: 0,
  lastFrame: performance.now(),
  shot: null,
};

function resizeCanvas() {
  // The canvas is sized in CSS pixels and drawn in the same units, so
  // every module can read canvas.width and canvas.height as the size
  // it draws into. No device-pixel scaling: the game is judged from
  // screenshots taken at a known window size.
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function pushMessage(text, color) {
  game.messages.push({ text, color: color || '#ffffff', life: 3.5 });
  if (game.messages.length > 3) game.messages.shift();
  statusLine.textContent = text;
}

function beginMission(index) {
  const mission = MISSIONS[index % MISSIONS.length];
  game.missionIndex = index % MISSIONS.length;
  game.plane = createAircraft(world);
  game.plane.fuel = mission.fuel;
  wind.speed = mission.wind;
  wind.direction = 0.6 + index * 0.9;
  game.mission = startMission(mission, world, game.plane);
  game.messages = [];
  game.state = 'playing';
  audio.enable();
  pushMessage(mission.name + ' — ' + mission.brief, '#ffe9b0');
}

function backToTitle() {
  game.state = 'title';
  game.plane = createAircraft(world);
  game.mission = null;
  game.messages = [];
  audio.stopEngine();
  clearPresses(input);
}

// One frame: read input, step the world, draw everything.
function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - game.lastFrame) / 1000));
  game.lastFrame = now;
  game.time += dt;

  const controls = readControls(input, dt);
  game.messages.forEach((message) => { message.life -= dt; });
  game.messages = game.messages.filter((message) => message.life > 0);

  if (game.state === 'title') {
    if (controls.mission1) beginMission(0);
    else if (controls.mission2) beginMission(1);
    else if (controls.mission3) beginMission(2);
    else if (controls.confirm) beginMission(game.missionIndex);
    // The parked aeroplane idles on the strip behind the title.
    game.plane.propAngle += dt * 8;
    drawScene(ctx, canvas, world, game.plane, null, game.time, clouds);
    drawTitle(ctx, canvas, world, game.plane, clouds, game.time);
  } else if (game.state === 'playing') {
    if (controls.pause) {
      game.state = 'paused';
    } else if (controls.restart) {
      beginMission(game.missionIndex);
    } else if (controls.menu) {
      backToTitle();
    } else {
      if (controls.gear) toggleGear(game.plane);
      if (controls.flaps) toggleFlaps(game.plane);
      stepAircraft(game.plane, controls, world, wind, dt);
      if (game.mission) {
        game.mission.elapsed = (now - game.mission.startedAt) / 1000;
        if (checkRing(game.plane, game.mission)) {
          audio.ringChime();
          pushMessage('Ring ' + game.mission.ringsPassed + ' of '
            + game.mission.rings.length + ' — nice flying', '#7ddb8a');
        }
        if (game.mission.mission.timeLimit > 0
          && game.mission.elapsed > game.mission.mission.timeLimit) {
          game.plane.crashed = true;
          game.plane.crashReason = 'Out of time on the patrol';
        }
      }
      if (game.plane.crashed) audio.warningBuzz();
      if (game.plane.crashed || game.plane.landed) {
        finishMission(game.mission, game.plane, world);
        game.state = 'end';
        audio.stopEngine();
      }
      audio.setEngine(game.plane.throttle, game.plane.airborne);
    }
    drawScene(ctx, canvas, world, game.plane, game.mission, game.time, clouds);
    drawHud(ctx, canvas, game.plane, game.mission, world, wind, game.messages);
  } else if (game.state === 'paused') {
    if (controls.pause || controls.confirm) game.state = 'playing';
    else if (controls.restart) beginMission(game.missionIndex);
    else if (controls.menu) backToTitle();
    drawScene(ctx, canvas, world, game.plane, game.mission, game.time, clouds);
    drawHud(ctx, canvas, game.plane, game.mission, world, wind, game.messages);
    drawPause(ctx, canvas);
  } else if (game.state === 'end') {
    if (controls.restart) beginMission(game.missionIndex);
    else if (controls.menu) backToTitle();
    else if (controls.mission1) beginMission(0);
    else if (controls.mission2) beginMission(1);
    else if (controls.mission3) beginMission(2);
    drawScene(ctx, canvas, world, game.plane, game.mission, game.time, clouds);
    drawHud(ctx, canvas, game.plane, game.mission, world, wind, game.messages);
    drawEnd(ctx, canvas, game.mission, game.plane);
  }

  requestAnimationFrame(frame);
}

// A ?shot= pose freezes the game in a fixed state for screenshots.
const shotQuery = readShotQuery();
if (shotQuery) {
  const pose = poseShot(shotQuery.shot, world);
  if (pose) {
    game.state = pose.state;
    game.plane = pose.plane;
    game.mission = pose.mission;
    if (pose.state === 'playing' && pose.mission) {
      pose.mission.startedAt = performance.now();
    }
    game.shot = shotQuery.shot;
    document.title = 'Ridgeline Courier — shot ' + shotQuery.shot;
  }
}

requestAnimationFrame(frame);
