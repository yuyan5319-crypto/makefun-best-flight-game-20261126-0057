// Ridgeline Courier — the scene: valley floor, river and roads, the two
// runways, glowing rings, the courier aeroplane and the sky above it.
// The camera rides behind the plane and the world turns underneath.
import { CONFIG } from './config.js';
import { groundHeightAt, mountainAt, worldToScreen } from './world.js';

// Draw one frame of the flying scene.
export function drawScene(ctx, canvas, world, plane, missionState, time, clouds) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = CONFIG.viewScale;
  const camera = { x: plane.x, y: plane.y, heading: plane.heading };

  drawGround(ctx, w, h, world, camera, scale);
  drawRunway(ctx, world.homeRunway, world, camera, w, h, scale, '09');
  drawRunway(ctx, world.farRunway, world, camera, w, h, scale, '27');
  drawRings(ctx, world, missionState, camera, w, h, scale, time);
  drawPlaneShadow(ctx, plane, w, h);
  drawClouds(ctx, w, h, clouds, plane, time);
  drawPlane(ctx, plane, w, h, time);
  drawSpeedLines(ctx, plane, w, h);
}

// The valley floor: meadow, patchwork fields, forest, river, roads, town.
function drawGround(ctx, w, h, world, camera, scale) {
  ctx.fillStyle = '#79a05a';
  ctx.fillRect(0, 0, w, h);

  const screen = (x, y) => worldToScreen({ x, y }, camera, w, h, scale);
  const onScreen = (p) => p.x > -400 && p.x < w + 400 && p.y > -400 && p.y < h + 400;

  // Hill shading: soft darker patches from the noise field.
  const step = 260;
  const view = 1600;
  for (let gx = Math.floor((camera.x - view) / step) * step; gx < camera.x + view; gx += step) {
    for (let gy = Math.floor((camera.y - view) / step) * step; gy < camera.y + view; gy += step) {
      const shade = world.hills(gx + world.half, gy + world.half);
      if (shade < 0.62) continue;
      const p = screen(gx, gy);
      if (!onScreen(p)) continue;
      ctx.fillStyle = 'rgba(46, 84, 40, ' + ((shade - 0.62) * 0.5).toFixed(3) + ')';
      ctx.fillRect(p.x, p.y, step / scale + 2, step / scale + 2);
    }
  }

  for (const field of world.fields) {
    const corners = [
      screen(field.x, field.y),
      screen(field.x + field.w, field.y),
      screen(field.x + field.w, field.y + field.h),
      screen(field.x, field.y + field.h),
    ];
    if (!corners.some(onScreen)) continue;
    ctx.fillStyle = field.color;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 70, 40, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const forest of world.forests) {
    const p = screen(forest.x, forest.y);
    if (!onScreen(p)) continue;
    ctx.fillStyle = '#557a45';
    ctx.beginPath();
    ctx.arc(p.x, p.y, forest.r / scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(52, 84, 42, 0.35)';
    ctx.beginPath();
    ctx.arc(p.x - forest.r / scale / 3, p.y - forest.r / scale / 4, forest.r / scale / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // River: a wide blue ribbon with a lighter centre line.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#5d94b8';
  ctx.lineWidth = 46 / scale;
  ctx.beginPath();
  world.river.forEach((point, i) => {
    const p = screen(point.x, point.y);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.strokeStyle = 'rgba(190, 220, 235, 0.55)';
  ctx.lineWidth = 14 / scale;
  ctx.stroke();

  for (const road of world.roads) {
    const a = screen(road.x1, road.y1);
    const b = screen(road.x2, road.y2);
    ctx.strokeStyle = '#8a7a5c';
    ctx.lineWidth = 12 / scale;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240, 230, 200, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const house of world.town) {
    const p = screen(house.x, house.y);
    if (!onScreen(p)) continue;
    ctx.fillStyle = house.color;
    ctx.fillRect(p.x, p.y, house.w / scale, house.h / scale);
    ctx.strokeStyle = 'rgba(40, 30, 20, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, p.y, house.w / scale, house.h / scale);
  }

  // Mountains: shaded cones with a pale cap, taller ones casting a rim.
  for (const mountain of world.mountains) {
    const p = screen(mountain.x, mountain.y);
    if (!onScreen(p)) continue;
    const r = mountain.r / scale;
    const gradient = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
    gradient.addColorStop(0, '#8d8578');
    gradient.addColorStop(0.7, '#6b6257');
    gradient.addColorStop(1, '#4e463d');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 238, 230, 0.85)';
    ctx.beginPath();
    ctx.arc(p.x - r * 0.2, p.y - r * 0.25, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 16, 12, 0.55)';
    ctx.font = 'bold ' + Math.max(11, r * 0.16) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(mountain.height) + ' ft', p.x, p.y + r * 0.55);
  }
}

// A grass strip: dark turf, pale centreline, threshold bars and a number.
function drawRunway(ctx, runway, world, camera, w, h, scale, label) {
  const screen = (x, y) => worldToScreen({ x, y }, camera, w, h, scale);
  const cos = Math.cos(runway.angle);
  const sin = Math.sin(runway.angle);
  const halfL = runway.length / 2;
  const halfW = runway.width / 2;
  const corners = [
    { x: -halfL, y: -halfW }, { x: halfL, y: -halfW },
    { x: halfL, y: halfW }, { x: -halfL, y: halfW },
  ].map((c) => screen(
    runway.x + c.x * cos - c.y * sin,
    runway.y + c.x * sin + c.y * cos,
  ));
  ctx.fillStyle = '#5c5648';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e8e2cc';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Centreline dashes.
  ctx.strokeStyle = '#f2ecd8';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  const a = screen(runway.x - halfL * cos, runway.y - halfL * sin);
  const b = screen(runway.x + halfL * cos, runway.y + halfL * sin);
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Threshold bars at both ends.
  for (const end of [-1, 1]) {
    const cx = runway.x + end * (halfL - 18) * cos;
    const cy = runway.y + end * (halfL - 18) * sin;
    const p = screen(cx, cy);
    ctx.fillStyle = '#f2ecd8';
    ctx.fillRect(p.x - 26, p.y - 3, 52, 6);
  }

  const centre = screen(runway.x, runway.y);
  ctx.fillStyle = '#f2ecd8';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, centre.x, centre.y - runway.width / scale / 2 - 10);
}

// Rings: the next one glows amber and pulses, later ones are dim cyan.
function drawRings(ctx, world, missionState, camera, w, h, scale, time) {
  if (!missionState) return;
  const screen = (x, y) => worldToScreen({ x, y }, camera, w, h, scale);
  missionState.rings.forEach((ring, index) => {
    const p = screen(ring.x, ring.y);
    if (p.x < -200 || p.x > w + 200 || p.y < -200 || p.y > h + 200) return;
    const radius = CONFIG.ringRadius / scale;
    const isNext = index === missionState.nextRing;
    const passed = ring.passed;
    ctx.save();
    ctx.globalAlpha = passed ? 0.25 : (isNext ? 0.95 : 0.5);
    ctx.strokeStyle = passed ? '#7ddb8a' : (isNext ? '#ffb62e' : '#57d7e8');
    ctx.lineWidth = isNext ? 7 : 4;
    ctx.shadowColor = isNext ? '#ffb62e' : '#57d7e8';
    ctx.shadowBlur = isNext ? 22 + Math.sin(time * 4) * 8 : 8;
    ctx.beginPath();
    // A hoop seen from above: an ellipse, taller than wide.
    ctx.ellipse(p.x, p.y, radius, radius * 1.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (isNext) {
      ctx.fillStyle = '#ffb62e';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RING ' + (index + 1) + ' · ' + Math.round(ring.altitude) + ' ft',
        p.x, p.y - radius * 1.55 - 12);
    }
  });
}

// The aeroplane's shadow on the ground, offset by altitude.
function drawPlaneShadow(ctx, plane, w, h) {
  const offset = CONFIG.shadowOffset + plane.altitude * 0.012;
  const alpha = Math.max(0.08, 0.34 - plane.altitude * 0.00006);
  ctx.save();
  ctx.translate(w / 2 + offset, h * 0.52 + offset * 0.6);
  ctx.rotate(plane.bank * 0.4);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#101408';
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Drifting cloud puffs, drawn in screen space with a slow parallax.
function drawClouds(ctx, w, h, clouds, plane, time) {
  ctx.save();
  for (const cloud of clouds) {
    const drift = (time * cloud.speed + cloud.seed * 997) % (w + 400);
    let x = (cloud.x + drift) % (w + 400) - 200;
    let y = cloud.y + Math.sin(time * 0.1 + cloud.seed) * 6;
    if (cloud.parallax) {
      x -= plane.x * 0.02;
      y -= plane.y * 0.02;
    }
    ctx.globalAlpha = cloud.alpha;
    ctx.fillStyle = '#ffffff';
    for (const puff of cloud.puffs) {
      ctx.beginPath();
      ctx.ellipse(x + puff.dx, y + puff.dy, puff.r, puff.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// The courier aeroplane: a high-wing bush plane, drawn nose-up, banking
// with the stick, propeller spinning, navigation lights lit.
export function drawPlane(ctx, plane, w, h, time) {
  const cx = w / 2;
  const cy = h * 0.52;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.bank);
  ctx.scale(1, 1 - Math.abs(plane.bank) * 0.12);

  // Wings first, so the fuselage sits on top.
  ctx.fillStyle = '#d8433a';
  ctx.beginPath();
  ctx.moveTo(-58, -2);
  ctx.lineTo(58, -2);
  ctx.lineTo(52, 10);
  ctx.lineTo(-52, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4ead2';
  ctx.fillRect(-58, 2, 116, 3);

  // Tailplane and fin.
  ctx.fillStyle = '#c23a31';
  ctx.beginPath();
  ctx.moveTo(-20, 34);
  ctx.lineTo(20, 34);
  ctx.lineTo(14, 42);
  ctx.lineTo(-14, 42);
  ctx.closePath();
  ctx.fill();

  // Fuselage: cream body, red cheatline, cockpit glass.
  ctx.fillStyle = '#f4ead2';
  ctx.beginPath();
  ctx.ellipse(0, 2, 13, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8433a';
  ctx.fillRect(-13, -6, 26, 5);
  ctx.fillStyle = '#9fd4e8';
  ctx.beginPath();
  ctx.ellipse(0, -16, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-3, -20, 3, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Propeller: a spinning blur disc and two blades.
  ctx.save();
  ctx.translate(0, -50);
  ctx.rotate(plane.propAngle);
  ctx.fillStyle = 'rgba(40, 36, 30, 0.85)';
  ctx.fillRect(-3, -26, 6, 52);
  ctx.fillRect(-26, -3, 52, 6);
  ctx.restore();
  ctx.fillStyle = 'rgba(200, 200, 200, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -50, 26, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Navigation lights: red port, green starboard, white tail.
  const blink = Math.sin(time * 6) > 0;
  ctx.fillStyle = blink ? '#ff2e2e' : '#7a1a1a';
  ctx.beginPath();
  ctx.arc(-58, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = blink ? '#2eff5e' : '#1a7a2e';
  ctx.beginPath();
  ctx.arc(58, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 44, 3, 0, Math.PI * 2);
  ctx.fill();

  // Landing light cone when the gear is down and the plane is low.
  if (plane.gearDown && plane.altitude < 800 && plane.airborne) {
    ctx.fillStyle = 'rgba(255, 244, 200, 0.10)';
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(-70, -260);
    ctx.lineTo(70, -260);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Speed lines at the screen edges when the throttle is wide open.
function drawSpeedLines(ctx, plane, w, h) {
  if (plane.speed < 150) return;
  const strength = (plane.speed - 150) / 60;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,' + (0.22 * strength).toFixed(3) + ')';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i += 1) {
    const edge = (i / 10) * w;
    const y = ((i * 137) % h);
    ctx.beginPath();
    ctx.moveTo(edge, y);
    ctx.lineTo(edge + 40 * strength, y);
    ctx.stroke();
  }
  ctx.restore();
}

// Clouds for the scene: a few soft puffs drifting across the sky.
export function makeClouds(seed) {
  const clouds = [];
  let s = seed;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 9; i += 1) {
    const puffs = [];
    const count = 3 + Math.floor(next() * 3);
    for (let j = 0; j < count; j += 1) {
      puffs.push({ dx: (next() - 0.5) * 160, dy: (next() - 0.5) * 40, r: 26 + next() * 42 });
    }
    clouds.push({
      x: next() * 1280,
      y: next() * 720,
      speed: 6 + next() * 14,
      alpha: 0.5 + next() * 0.3,
      seed: next() * 10,
      parallax: i % 3 === 0,
      puffs,
    });
  }
  return clouds;
}
