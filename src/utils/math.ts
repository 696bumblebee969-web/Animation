export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

export function remap(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = clamp((v - inMin) / (inMax - inMin || 1), 0, 1);
  return lerp(outMin, outMax, t);
}

/** Deterministic seeded PRNG (Mulberry32) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(ix: number, iy: number, seed = 1337): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Deterministic 2D value noise in [0, 1] */
export function valueNoise2D(x: number, y: number, seed = 1337): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

/** Deterministic fractal Brownian motion */
export function fbm2D(x: number, y: number, octaves = 4, seed = 1337): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise2D(x * freq, y * freq, seed + i * 97);
    norm += amp;
    amp *= 0.5;
    freq *= 2.02;
  }
  return val / norm;
}

/** Deterministic camera trauma shake */
export function evalTraumaShake(t: number, amp: number): { sx: number; sy: number; rot: number } {
  if (amp <= 0.01) return { sx: 0, sy: 0, rot: 0 };
  const n1 = Math.sin(t * 47.3) * 0.6 + Math.sin(t * 83.1 + 1.2) * 0.4;
  const n2 = Math.cos(t * 53.7 + 0.7) * 0.6 + Math.cos(t * 91.9 + 2.4) * 0.4;
  const n3 = Math.sin(t * 39.1 + 2.1);
  return {
    sx: n1 * amp,
    sy: n2 * amp * 0.85,
    rot: n3 * amp * 0.0012,
  };
}
