// Ridgeline Courier — the instruments: airspeed and altitude tapes, the
// heading compass, fuel and damage bars, throttle, the mission line and
// the minimap. Plus the title screen, pause and end screens.
import { MISSIONS, CONFIG } from './config.js';
import { missionObjective, formatTime } from './missions.js';
import { worldToScreen } from './world.js';

// Draw the full HUD over the flying scene.
export function drawHud(ctx, canvas, plane, missionState, world, wind, messages) {
  const w = canvas.width;
  const h = canvas.height;

  drawAirspeedTape(ctx, plane, 24, 96);
  drawAltitudeTape(ctx, plane, w - 104, 96);
  drawCompass(ctx, plane, w / 2, 34);
  drawFuelDamage(ctx, plane, w - 240, h - 108);
  drawThrottle(ctx, plane, 24, h - 108);
  drawMissionLine(ctx, missionState, plane, w, h);
  drawMinimap(ctx, world, plane, missionState, w - 196, h - 300);
  drawMessages(ctx, messages, w, h);
  drawWarnings(ctx, plane, missionState, w, h);
  drawWind(ctx, wind, w - 336, 96);
}

// Left tape: airspeed in knots, with a stall marker.
function drawAirspeedTape(ctx, plane, x, y) {
  drawTapeFrame(ctx, x, y, 'AIRSPEED', 'KT');
  const speed = Math.round(plane.speed);
  ctx.fillStyle = plane.speed < CONFIG.stallSpeed && plane.airborne ? '#ff5040' : '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(speed), x + 40, y + 58);
  if (plane.airborne && plane.speed < CONFIG.stallSpeed) {
    ctx.fillStyle = '#ff5040';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('STALL', x + 40, y + 84);
  }
  ctx.fillStyle = '#ffb62e';
  ctx.font = '11px sans-serif';
  ctx.fillText('Vso ' + CONFIG.stallSpeed, x + 40, y + 102);
}

// Right tape: altitude in feet, with vertical speed below it.
function drawAltitudeTape(ctx, plane, x, y) {
  drawTapeFrame(ctx, x, y, 'ALTITUDE', 'FT');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(plane.altitude)), x + 40, y + 58);
  const vs = Math.round(plane.verticalSpeed);
  ctx.fillStyle = vs >= 0 ? '#7ddb8a' : '#ffb62e';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText((vs >= 0 ? '+' : '') + vs + ' fpm', x + 40, y + 84);
}

function drawTapeFrame(ctx, x, y, label, unit) {
  ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, 80, 116, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fb4c8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + 40, y + 18);
  ctx.fillStyle = '#7d8fa3';
  ctx.font = '10px sans-serif';
  ctx.fillText(unit, x + 40, y + 106);
}

// Top centre: a heading compass tape with the cardinal points.
function drawCompass(ctx, plane, cx, cy) {
  const headingDeg = ((plane.heading * 180 / Math.PI) % 360 + 360) % 360;
  ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  roundRect(ctx, cx - 190, cy - 18, 380, 44, 8);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 190, cy - 18, 380, 44);
  ctx.clip();
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let deg = -180; deg <= 540; deg += 15) {
    const rel = ((deg - headingDeg + 540) % 360) - 180;
    const px = cx + rel * 1.05;
    if (px < cx - 190 || px > cx + 190) continue;
    const major = deg % 45 === 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(px, cy + 16);
    ctx.lineTo(px, cy + (major ? 2 : 8));
    ctx.stroke();
    if (major) {
      const label = points[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
      ctx.fillStyle = '#cfe0ee';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, cy - 4);
    }
  }
  ctx.restore();
  // The lubber line and the digital readout.
  ctx.fillStyle = '#ffb62e';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx - 6, cy - 28);
  ctx.lineTo(cx + 6, cy - 28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(headingDeg)).padStart(3, '0') + '°', cx, cy + 40);
}

// Bottom right: fuel and damage bars with numbers.
function drawFuelDamage(ctx, plane, x, y) {
  ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  roundRect(ctx, x, y, 216, 84, 8);
  ctx.fill();
  ctx.stroke();
  drawBar(ctx, x + 12, y + 14, 192, 14, plane.fuel / 100,
    plane.fuel < 20 ? '#ff5040' : '#7ddb8a', 'FUEL ' + Math.round(plane.fuel) + '%');
  drawBar(ctx, x + 12, y + 46, 192, 14, 1 - plane.damage / 100,
    plane.damage > 60 ? '#ff5040' : '#57d7e8', 'AIRFRAME ' + Math.round(100 - plane.damage) + '%');
}

function drawBar(ctx, x, y, w, h, fraction, color, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.fillStyle = color;
  if (fraction > 0) {
    roundRect(ctx, x, y, Math.max(6, w * fraction), h, 4);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6, y + 11);
}

// Bottom left: throttle lever and gear/flaps state.
function drawThrottle(ctx, plane, x, y) {
  ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  roundRect(ctx, x, y, 216, 84, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fb4c8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THROTTLE', x + 12, y + 18);
  drawBar(ctx, x + 12, y + 26, 192, 14, plane.throttle, '#ffb62e',
    Math.round(plane.throttle * 100) + '%');
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '12px sans-serif';
  ctx.fillText('GEAR ' + (plane.gearDown ? 'DOWN' : 'UP') + '   FLAPS ' + (plane.flaps ? 'ON' : 'OFF'),
    x + 12, y + 64);
}

// Bottom centre: what the mission wants next, plus score and clock.
function drawMissionLine(ctx, missionState, plane, w, h) {
  if (!missionState) return;
  ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  const text = missionObjective(missionState, plane);
  ctx.font = 'bold 15px sans-serif';
  const tw = ctx.measureText(text).width;
  const boxW = Math.max(420, tw + 32);
  roundRect(ctx, w / 2 - boxW / 2, h - 56, boxW, 36, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe9b0';
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h - 33);
  // Score and clock on their own dark chip, so they stay readable over
  // bright fields instead of floating on the ground.
  const chipText = 'SCORE ' + missionState.score + '   ' + formatTime(missionState.elapsed);
  ctx.font = 'bold 12px sans-serif';
  const chipW = ctx.measureText(chipText).width + 20;
  ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  roundRect(ctx, w / 2 + boxW / 2 - chipW - 8, h - 92, chipW, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fb4c8';
  ctx.textAlign = 'right';
  ctx.fillText(chipText, w / 2 + boxW / 2 - 18, h - 76);
}

// Bottom right above the fuel bars: a rotating minimap of the valley.
function drawMinimap(ctx, world, plane, missionState, x, y) {
  const size = 172;
  ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  roundRect(ctx, x, y, size, size, 8);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 4, y + 4, size - 8, size - 8);
  ctx.clip();
  const scale = size / world.size;
  const mapX = (wx) => x + (wx + world.half) * scale;
  const mapY = (wy) => y + (wy + world.half) * scale;

  ctx.fillStyle = '#5d7d43';
  ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
  ctx.strokeStyle = '#5d94b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  world.river.forEach((point, i) => {
    if (i === 0) ctx.moveTo(mapX(point.x), mapY(point.y)); else ctx.lineTo(mapX(point.x), mapY(point.y));
  });
  ctx.stroke();
  ctx.fillStyle = '#e8e2cc';
  for (const runway of [world.homeRunway, world.farRunway]) {
    ctx.save();
    ctx.translate(mapX(runway.x), mapY(runway.y));
    ctx.rotate(runway.angle);
    ctx.fillRect(-8, -2, 16, 4);
    ctx.restore();
  }
  if (missionState) {
    missionState.rings.forEach((ring, index) => {
      ctx.fillStyle = ring.passed ? '#7ddb8a' : (index === missionState.nextRing ? '#ffb62e' : '#57d7e8');
      ctx.beginPath();
      ctx.arc(mapX(ring.x), mapY(ring.y), index === missionState.nextRing ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // The aeroplane: a small triangle pointing along its heading.
  ctx.save();
  ctx.translate(mapX(plane.x), mapY(plane.y));
  ctx.rotate(plane.heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = '#9fb4c8';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VALLEY MAP', x + 6, y + size - 6);
}

// Centre-screen toast messages (ring passed, warnings).
function drawMessages(ctx, messages, w, h) {
  ctx.textAlign = 'center';
  messages.forEach((message, index) => {
    const alpha = Math.min(1, message.life * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = message.color;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(message.text, w / 2, h * 0.30 + index * 30);
  });
  ctx.globalAlpha = 1;
}

// Flashing warnings: stall, low fuel, gear up on final.
function drawWarnings(ctx, plane, missionState, w, h) {
  const warnings = [];
  if (plane.airborne && plane.speed < CONFIG.stallSpeed) warnings.push('STALL — NOSE DOWN, ADD POWER');
  if (plane.fuel < 20 && plane.fuel > 0) warnings.push('LOW FUEL — ' + Math.round(plane.fuel) + '% LEFT');
  if (plane.fuel <= 0) warnings.push('FUEL EXHAUSTED — GLIDE TO A FIELD');
  if (plane.altitude < 400 && plane.airborne && !plane.gearDown) warnings.push('GEAR UP — PRESS G');
  if (warnings.length === 0) return;
  ctx.fillStyle = '#ff5040';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  warnings.forEach((warning, index) => {
    ctx.fillText(warning, w / 2, h * 0.22 + index * 26);
  });
}

function drawWind(ctx, wind, x, y) {
  ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  roundRect(ctx, x, y, 216, 40, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  const dir = Math.round(((wind.direction * 180 / Math.PI) % 360 + 360) % 360);
  ctx.fillText('WIND ' + dir + '° at ' + Math.round(wind.speed * 1.94) + ' kt', x + 12, y + 25);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- Screens ----

// Title screen: the game name, the three missions, the controls.
export function drawTitle(ctx, canvas, world, plane, clouds, time) {
  const w = canvas.width;
  const h = canvas.height;
  drawTitleBackdrop(ctx, w, h, time);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('RIDGELINE COURIER', w / 2, 118);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText('A bush-plane courier over the valley — rings, parcels and one old strip.', w / 2, 152);
  ctx.fillStyle = '#9fd4e8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('CHOOSE A SORTIE — PRESS 1, 2 OR 3', w / 2, 210);
  MISSIONS.forEach((mission, index) => {
    const y = 258 + index * 92;
    ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    roundRect(ctx, w / 2 - 330, y - 34, 660, 72, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb62e';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((index + 1) + '  ' + mission.name, w / 2 - 310, y - 4);
    ctx.fillStyle = '#cfe0ee';
    ctx.font = '15px sans-serif';
    ctx.fillText(mission.brief, w / 2 - 310, y + 20);
    ctx.fillStyle = '#7ddb8a';
    ctx.textAlign = 'right';
    ctx.fillText(mission.rings + ' rings · wind ' + mission.wind + ' kt',
      w / 2 + 310, y - 4);
    ctx.textAlign = 'center';
  });
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '15px sans-serif';
  ctx.fillText('Fly: ← → bank · ↑ ↓ pitch · Shift full throttle · C cut throttle · G gear · F flaps', w / 2, h - 92);
  ctx.fillText('Mouse steers too — hold the pointer off-centre. Wheel trims the throttle. P pauses, R restarts.', w / 2, h - 64);
  ctx.fillStyle = '#7d8fa3';
  ctx.font = '13px sans-serif';
  ctx.fillText('Land gently on a strip, gear down, under 95 kt — or the valley keeps the aeroplane.', w / 2, h - 34);
}

function drawTitleBackdrop(ctx, w, h, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2c4d6e');
  sky.addColorStop(0.55, '#7ba7c4');
  sky.addColorStop(1, '#c9d9c2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 240, 190, 0.9)';
  ctx.beginPath();
  ctx.arc(w * 0.78, 90, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d7d43';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.quadraticCurveTo(w * 0.3, h * 0.42, w * 0.6, h * 0.6);
  ctx.quadraticCurveTo(w * 0.85, h * 0.74, w, h * 0.58);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4a6b38';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.quadraticCurveTo(w * 0.4, h * 0.6, w, h * 0.76);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}

// Pause overlay.
export function drawPause(ctx, canvas) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = 'rgba(8, 12, 20, 0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', w / 2, h / 2 - 12);
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '17px sans-serif';
  ctx.fillText('P to resume · R to restart · M for the mission list', w / 2, h / 2 + 28);
}

// End screen: mission complete, sortie lost, or landed short.
export function drawEnd(ctx, canvas, missionState, plane) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = 'rgba(8, 12, 20, 0.66)';
  ctx.fillRect(0, 0, w, h);
  const won = missionState.result === 'Mission complete';
  ctx.fillStyle = won ? '#7ddb8a' : '#ffb62e';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(missionState.result.toUpperCase(), w / 2, h / 2 - 74);
  ctx.fillStyle = '#ffffff';
  ctx.font = '19px sans-serif';
  ctx.fillText(missionState.detail, w / 2, h / 2 - 32);
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '17px sans-serif';
  ctx.fillText('Rings ' + missionState.ringsPassed + ' / ' + missionState.rings.length
    + '   ·   Time ' + formatTime(missionState.elapsed)
    + '   ·   Score ' + missionState.score, w / 2, h / 2 + 6);
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '15px sans-serif';
  ctx.fillText('R to fly again · M for another mission · 1 / 2 / 3 to pick a sortie', w / 2, h / 2 + 52);
}
