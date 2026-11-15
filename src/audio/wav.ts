import fs from 'node:fs/promises';
import path from 'node:path';

/** Encodes a stereo Float32 buffer pair into a 16-bit PCM WAV file */
export async function writeStereoWav(
  filePath: string,
  left: Float32Array,
  right: Float32Array,
  sampleRate = 48000
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const numSamples = Math.min(left.length, right.length);
  const dataBytes = numSamples * 2 * 2; // stereo * 16-bit
  const buf = Buffer.alloc(44 + dataBytes);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20);  // PCM format
  buf.writeUInt16LE(2, 22);  // Stereo
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(Math.round(l * 32767), offset);
    buf.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }

  await fs.writeFile(filePath, buf);
}

/** Mixes a mono float signal into an existing stereo buffer at startSec */
export function mixMonoIntoStereo(
  left: Float32Array,
  right: Float32Array,
  mono: Float32Array,
  startSec: number,
  sampleRate = 48000,
  gain = 1.0
): void {
  const startIdx = Math.floor(startSec * sampleRate);
  for (let i = 0; i < mono.length; i++) {
    const dst = startIdx + i;
    if (dst < 0 || dst >= left.length) continue;
    const s = mono[i] * gain;
    left[dst] += s;
    right[dst] += s;
  }
}

/** Synthesizes a deterministic stereo lush cathedral/hall impulse response */
export function buildConcertImpulseResponse(
  sampleRate = 48000,
  durationSec = 2.6
): { left: Float32Array; right: Float32Array } {
  const len = Math.floor(sampleRate * durationSec);
  const left = new Float32Array(len);
  const right = new Float32Array(len);
  let seed = 419283;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296 - 0.5;
  };
  let lpL = 0;
  let lpR = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-t * 2.2) * Math.min(1, t * 80);
    lpL = lpL * 0.65 + nextRand() * 0.35;
    lpR = lpR * 0.65 + nextRand() * 0.35;
    left[i] = lpL * decay;
    right[i] = lpR * decay;
  }
  return { left, right };
}
