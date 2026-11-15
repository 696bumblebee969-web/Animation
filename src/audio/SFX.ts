import './nodePolyfill';
import { mixMonoIntoStereo, writeStereoWav } from './wav';

function makeSoftFootstep(sampleRate: number): Float32Array {
  const len = Math.floor(sampleRate * 0.14);
  const out = new Float32Array(len);
  let seed = 9182;
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = seed / 4294967296 - 0.5;
    lp = lp * 0.82 + n * 0.18;
    const thump = Math.sin(2 * Math.PI * (95 - t * 380) * t) * Math.exp(-t * 42);
    const grit = lp * Math.exp(-t * 36) * 0.85;
    out[i] = (thump * 0.55 + grit) * 0.35;
  }
  return out;
}

function makeLanternLatch(sampleRate: number): Float32Array {
  const len = Math.floor(sampleRate * 0.25);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const clink =
      Math.sin(2 * Math.PI * 1120 * t) * Math.exp(-t * 28) * 0.4 +
      Math.sin(2 * Math.PI * 1840 * t) * Math.exp(-t * 38) * 0.3;
    const creak = Math.sin(2 * Math.PI * (280 + t * 90) * t) * Math.exp(-t * 14) * 0.25;
    out[i] = (clink + creak) * 0.45;
  }
  return out;
}

function makeStarShimmer(sampleRate: number, durationSec: number, baseFreq: number): Float32Array {
  const len = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const env = Math.sin((t / durationSec) * Math.PI);
    const wave =
      Math.sin(2 * Math.PI * baseFreq * t) * 0.5 +
      Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.3 +
      Math.sin(2 * Math.PI * baseFreq * 2.0 * t) * 0.2;
    out[i] = wave * env * 0.16;
  }
  return out;
}

function makeLightBurstAndRise(sampleRate: number): Float32Array {
  const len = Math.floor(sampleRate * 3.4);
  const out = new Float32Array(len);
  let seed = 44211;
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = seed / 4294967296 - 0.5;
    lp = lp * 0.9 + n * 0.1;

    // Initial crystalline sub impact + harmonic bell burst at t=0
    const subBoom = Math.sin(2 * Math.PI * (78 * Math.exp(-t * 2.4) + 36) * t) * Math.exp(-t * 3.2) * 0.55;
    const chime =
      (Math.sin(2 * Math.PI * 880 * t) + Math.sin(2 * Math.PI * 1320 * t) * 0.6) *
      Math.exp(-t * 1.8) *
      0.32;

    // Rising aerodynamic whoosh sweeping pitch upward from 21.0s to 24.2s
    const sweepFreq = 220 + t * 440;
    const riseWhoosh =
      (lp * 0.9 + Math.sin(2 * Math.PI * sweepFreq * t) * 0.22) *
      Math.min(1, t * 4) *
      Math.exp(-Math.max(0, t - 1.0) * 0.95);

    out[i] = (subBoom + chime + riseWhoosh * 0.55) * 0.72;
  }
  return out;
}

/**
 * Generates deterministic stereo SFX track tightly locked to visual events across all 30 seconds.
 */
export async function renderSfxWav(outputPath: string, sampleRate = 48000): Promise<void> {
  const totalSamples = 30 * sampleRate;
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // 1. Subtle night city breeze bed across 0–30s
  let seed = 7731;
  let lpL = 0;
  let lpR = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = seed / 4294967296 - 0.5;
    lpL = lpL * 0.985 + n * 0.015;
    lpR = lpR * 0.982 + n * 0.018;
    const gust = 0.055 + 0.03 * Math.sin(t * 0.65) + (t >= 20.5 && t <= 25 ? 0.06 : 0);
    left[i] = lpL * gust;
    right[i] = lpR * gust;
  }

  // 2. Child footsteps synced to walkCycle (Scenes 1 & 2)
  const footstep = makeSoftFootstep(sampleRate);
  const stepTimes = [
    0.45, 1.08, 1.72, 2.36, 3.0, 3.64, 4.28, 4.92, // Scene 1 stride
    6.75, 7.42, 8.08,                              // Scene 2 cautious approach
  ];
  for (const st of stepTimes) {
    mixMonoIntoStereo(left, right, footstep, st, sampleRate, 0.55);
  }

  // 3. Soft magical star hum on discovery (5.2s) & warm pulse when cradled (13.1s)
  mixMonoIntoStereo(left, right, makeStarShimmer(sampleRate, 2.2, 528), 5.2, sampleRate, 0.45);
  mixMonoIntoStereo(left, right, makeStarShimmer(sampleRate, 2.4, 587), 13.1, sampleRate, 0.5);

  // 4. Metallic lantern clink on pickup (12.9s) and hinge opening (16.2s)
  const latch = makeLanternLatch(sampleRate);
  mixMonoIntoStereo(left, right, latch, 12.9, sampleRate, 0.55);
  mixMonoIntoStereo(left, right, latch, 16.2, sampleRate, 0.72);

  // 5. Explosive release shockwave & upward ascent whoosh (21.0s)
  mixMonoIntoStereo(left, right, makeLightBurstAndRise(sampleRate), 21.0, sampleRate, 0.9);

  // 6. Celestial sky breakthrough shimmer chord (24.2s)
  mixMonoIntoStereo(left, right, makeStarShimmer(sampleRate, 3.2, 740), 24.15, sampleRate, 0.75);
  mixMonoIntoStereo(left, right, makeStarShimmer(sampleRate, 3.0, 1108), 24.25, sampleRate, 0.55);

  // Soft limiter safety pass
  for (let i = 0; i < totalSamples; i++) {
    left[i] = Math.tanh(left[i]);
    right[i] = Math.tanh(right[i]);
  }

  await writeStereoWav(outputPath, left, right, sampleRate);
}
