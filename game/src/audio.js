// Ridgeline Courier — small sounds, made on the spot with WebAudio.
// No audio files ship with the game; every tone is synthesised here.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let enabled = false;

  function ensureContext() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  // A short two-note chime when a ring is flown through.
  function ringChime() {
    const ctx = ensureContext();
    if (!ctx || !enabled) return;
    [660, 990].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + index * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.09 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.09);
      osc.stop(ctx.currentTime + index * 0.09 + 0.45);
    });
  }

  // A low warning buzz for a stall or a crash.
  function warningBuzz() {
    const ctx = ensureContext();
    if (!ctx || !enabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  }

  // A soft engine drone whose pitch follows the throttle.
  function setEngine(throttle, airborne) {
    if (!enabled) return;
    const ctx = ensureContext();
    if (!ctx) return;
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'triangle';
      engineOsc.frequency.value = 60;
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(ctx.destination);
      engineOsc.start();
    }
    engineOsc.frequency.setTargetAtTime(52 + throttle * 70, ctx.currentTime, 0.1);
    engineGain.gain.setTargetAtTime(airborne ? 0.03 + throttle * 0.05 : 0.015, ctx.currentTime, 0.1);
  }

  function enable() {
    enabled = true;
    ensureContext();
  }

  function stopEngine() {
    if (engineGain) engineGain.gain.value = 0;
  }

  return { ringChime, warningBuzz, setEngine, enable, stopEngine };
}
