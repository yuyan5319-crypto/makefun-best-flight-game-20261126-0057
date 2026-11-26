// Ridgeline Courier — keyboard and mouse. The aeroplane answers to both:
// arrows or WASD fly it, the mouse steers by position, the wheel works
// the throttle, and a few keys run the flaps, the gear and the menus.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    wheelDelta: 0,
    pressed: new Set(),
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    input.pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) / rect.width - 0.5;
    input.mouseY = (event.clientY - rect.top) / rect.height - 0.5;
    input.mouseActive = true;
  });
  canvas.addEventListener('mouseleave', () => {
    input.mouseActive = false;
  });
  canvas.addEventListener('wheel', (event) => {
    input.wheelDelta += event.deltaY;
    event.preventDefault();
  }, { passive: false });

  return input;
}

// Read the current control axes from the input state. Returns
// { roll, pitch, throttleDelta } plus one-shot flags, and clears them.
export function readControls(input, dt) {
  const left = input.keys.has('ArrowLeft') || input.keys.has('KeyA');
  const right = input.keys.has('ArrowRight') || input.keys.has('KeyD');
  const up = input.keys.has('ArrowUp') || input.keys.has('KeyW');
  const down = input.keys.has('ArrowDown') || input.keys.has('KeyS');

  let roll = (right ? 1 : 0) - (left ? 1 : 0);
  let pitch = (up ? 1 : 0) - (down ? 1 : 0);

  // The mouse steers too: hold the pointer off-centre and the stick
  // follows it, so the game plays with one hand as well.
  if (input.mouseActive && !left && !right && !up && !down) {
    roll = Math.max(-1, Math.min(1, input.mouseX * 2.4));
    pitch = Math.max(-1, Math.min(1, -input.mouseY * 2.4));
  }

  // Throttle: Shift for full power, C to cut it, wheel to trim it.
  let throttleDelta = 0;
  if (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) throttleDelta = 0.9;
  if (input.keys.has('KeyC')) throttleDelta = -0.9;
  if (input.wheelDelta !== 0) {
    throttleDelta += -Math.sign(input.wheelDelta) * 0.25;
    input.wheelDelta = 0;
  }

  const controls = {
    roll,
    pitch,
    throttleDelta,
    gear: consumePress(input, 'KeyG'),
    flaps: consumePress(input, 'KeyF'),
    pause: consumePress(input, 'KeyP') || consumePress(input, 'Escape'),
    restart: consumePress(input, 'KeyR'),
    menu: consumePress(input, 'KeyM'),
    confirm: consumePress(input, 'Enter') || consumePress(input, 'Space'),
    mission1: consumePress(input, 'Digit1'),
    mission2: consumePress(input, 'Digit2'),
    mission3: consumePress(input, 'Digit3'),
  };
  return controls;
}

function consumePress(input, code) {
  if (input.pressed.has(code)) {
    input.pressed.delete(code);
    return true;
  }
  return false;
}

// Clear one-shot presses, e.g. when the state changes.
export function clearPresses(input) {
  input.pressed.clear();
}
