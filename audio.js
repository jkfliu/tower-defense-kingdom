// ─── audio.js ─────────────────────────────────────────────────────────────────
// Web Audio API sound effects. Reads global: muted.

let audioCtx = null;
let muted    = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playArrowShot() {
  if (muted) return;
  try {
    const ac = getAudioCtx();
    const t  = ac.currentTime;

    // Bowstring twang: triangle oscillator dropping fast
    const twang     = ac.createOscillator();
    const twangGain = ac.createGain();
    twang.type = 'triangle';
    twang.frequency.setValueAtTime(80 + Math.random() * 20, t);
    twang.frequency.exponentialRampToValueAtTime(40, t + 0.06);
    twangGain.gain.setValueAtTime(0.18, t);
    twangGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    twang.connect(twangGain);
    twangGain.connect(ac.destination);
    twang.start(t);
    twang.stop(t + 0.07);

    // Arrow whoosh: short filtered noise puff
    const frames = Math.floor(ac.sampleRate * 0.05);
    const buf    = ac.createBuffer(1, frames, ac.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2);
    }
    const whoosh     = ac.createBufferSource();
    whoosh.buffer    = buf;
    const whooshGain = ac.createGain();
    whooshGain.gain.setValueAtTime(0.08, t);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    whoosh.connect(whooshGain);
    whooshGain.connect(ac.destination);
    whoosh.start(t);
  } catch (_) {}
}

function playExplosion() {
  if (muted) return;
  try {
    const ac = getAudioCtx();
    const t  = ac.currentTime;

    const boomOsc  = ac.createOscillator();
    const boomGain = ac.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(90, t);
    boomOsc.frequency.exponentialRampToValueAtTime(18, t + 0.45);
    boomGain.gain.setValueAtTime(0.9, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    boomOsc.connect(boomGain);
    boomGain.connect(ac.destination);
    boomOsc.start(t);
    boomOsc.stop(t + 0.46);

    const dur    = 0.28;
    const frames = Math.floor(ac.sampleRate * dur);
    const buf    = ac.createBuffer(1, frames, ac.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 1.5);
    }
    const src       = ac.createBufferSource();
    src.buffer      = buf;
    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(noiseGain);
    noiseGain.connect(ac.destination);
    src.start(t);
  } catch (_) {}
}

function playMagicShot(tier) {
  if (muted) return;
  try {
    const ac = getAudioCtx();
    const t  = ac.currentTime;

    if (tier === 'basic') {
      // Soft sine tone, dim purple feel
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(t); osc.stop(t + 0.13);

    } else if (tier === 'advanced') {
      // Two-oscillator chord with short delay reverb
      for (const freq of [320, 480]) {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.15);
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        const delay = ac.createDelay(0.1);
        delay.delayTime.value = 0.06;
        const delayGain = ac.createGain();
        delayGain.gain.value = 0.3;
        osc.connect(gain); gain.connect(ac.destination);
        gain.connect(delay); delay.connect(delayGain); delayGain.connect(ac.destination);
        osc.start(t); osc.stop(t + 0.16);
      }

    } else {
      // Three oscillators, gain swell then decay — arcane power
      for (const [freq, offset] of [[220, 0], [440, 0.01], [880, 0.02]]) {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + offset);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(t); osc.stop(t + 0.21);
      }
    }
  } catch (_) {}
}
