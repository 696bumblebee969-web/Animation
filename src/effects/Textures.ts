import { Texture } from 'pixi.js';
import { fbm2D, mulberry32 } from '../utils/math';

export interface ProceduralTextures {
  glowSoft: Texture;
  glowWarm: Texture;
  flareCross: Texture;
  cloudPuffs: Texture[];
  fogBand: Texture;
  paperGrain: Texture;
  vignette: Texture;
  spark: Texture;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable for procedural textures');
  return [c, ctx];
}

function buildRadialGlow(size: number, stops: Array<[number, string]>): Texture {
  const [c, ctx] = makeCanvas(size, size);
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, color] of stops) {
    grad.addColorStop(offset, color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

function buildFlareCross(size: number): Texture {
  const [c, ctx] = makeCanvas(size, size);
  const half = size / 2;
  ctx.clearRect(0, 0, size, size);

  // Soft core halo
  const core = ctx.createRadialGradient(half, half, 0, half, half, half * 0.45);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.25, 'rgba(180,238,255,0.55)');
  core.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // Horizontal & vertical diffraction spikes
  for (let pass = 0; pass < 2; pass++) {
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate((pass * Math.PI) / 2);
    const spike = ctx.createLinearGradient(-half, 0, half, 0);
    spike.addColorStop(0, 'rgba(255,255,255,0)');
    spike.addColorStop(0.45, 'rgba(225,248,255,0.45)');
    spike.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    spike.addColorStop(0.55, 'rgba(225,248,255,0.45)');
    spike.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spike;
    ctx.beginPath();
    ctx.ellipse(0, 0, half * 0.96, size * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return Texture.from(c);
}

function buildCloudPuff(seed: number, w = 640, h = 360): Texture {
  const [c, ctx] = makeCanvas(w, h);
  const rng = mulberry32(seed);

  // Base dark cloud belly lobes
  const lobes = 16;
  for (let i = 0; i < lobes; i++) {
    const t = i / (lobes - 1);
    const cx = w * (0.14 + t * 0.72) + (rng() - 0.5) * 45;
    const cy = h * (0.48 + (rng() - 0.5) * 0.24 - Math.sin(t * Math.PI) * 0.14);
    const r = 75 + rng() * 95;
    const g = ctx.createRadialGradient(cx, cy - r * 0.18, r * 0.08, cx, cy, r);
    g.addColorStop(0, 'rgba(42, 50, 74, 0.88)');
    g.addColorStop(0.58, 'rgba(25, 31, 49, 0.65)');
    g.addColorStop(1, 'rgba(14, 18, 30, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Painterly upper highlight wisps
  for (let i = 0; i < 10; i++) {
    const cx = w * (0.2 + rng() * 0.6);
    const cy = h * (0.28 + rng() * 0.22);
    const r = 45 + rng() * 65;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(84, 102, 140, 0.34)');
    g.addColorStop(0.7, 'rgba(46, 58, 86, 0.14)');
    g.addColorStop(1, 'rgba(24, 30, 48, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return Texture.from(c);
}

function buildFogBand(w = 1024, h = 256): Texture {
  const [c, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let y = 0; y < h; y++) {
    const ny = y / h;
    const vMask = Math.sin(ny * Math.PI);
    const vFalloff = vMask * vMask;
    for (let x = 0; x < w; x++) {
      // Seamless horizontal wrap via periodic circle sampling
      const angle = (x / w) * Math.PI * 2;
      const sx = Math.cos(angle) * 2.2 + 4.0;
      const sy = Math.sin(angle) * 2.2 + ny * 3.5;
      const n = fbm2D(sx, sy, 4, 901);
      const alpha = Math.max(0, (n - 0.32) * 1.45) * vFalloff;
      const idx = (y * w + x) * 4;
      data[idx] = 175;
      data[idx + 1] = 200;
      data[idx + 2] = 228;
      data[idx + 3] = Math.min(255, Math.floor(alpha * 140));
    }
  }
  ctx.putImageData(img, 0, 0);
  return Texture.from(c);
}

function buildPaperGrain(size = 256): Texture {
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const rng = mulberry32(4242);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rng() - 0.5) * 70;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v + 6;
    img.data[i + 3] = 26;
  }
  ctx.putImageData(img, 0, 0);
  return Texture.from(c);
}

function buildVignette(w = 960, h = 540): Texture {
  const [c, ctx] = makeCanvas(w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.28, w * 0.5, h * 0.5, w * 0.64);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.65, 'rgba(2,4,10,0.28)');
  g.addColorStop(1, 'rgba(1,2,6,0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return Texture.from(c);
}

export function createProceduralTextures(): ProceduralTextures {
  return {
    glowSoft: buildRadialGlow(256, [
      [0, 'rgba(255,255,255,1)'],
      [0.2, 'rgba(210,245,255,0.68)'],
      [0.5, 'rgba(95,180,255,0.22)'],
      [1, 'rgba(30,90,200,0)'],
    ]),
    glowWarm: buildRadialGlow(256, [
      [0, 'rgba(255,244,210,1)'],
      [0.24, 'rgba(255,190,105,0.55)'],
      [0.58, 'rgba(205,115,45,0.16)'],
      [1, 'rgba(120,55,10,0)'],
    ]),
    flareCross: buildFlareCross(256),
    cloudPuffs: [
      buildCloudPuff(101),
      buildCloudPuff(202),
      buildCloudPuff(303),
      buildCloudPuff(404),
    ],
    fogBand: buildFogBand(),
    paperGrain: buildPaperGrain(),
    vignette: buildVignette(),
    spark: buildRadialGlow(64, [
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(195,244,255,0.8)'],
      [1, 'rgba(100,190,255,0)'],
    ]),
  };
}
