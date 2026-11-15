import { Container, Sprite } from 'pixi.js';
import { ProceduralTextures } from './Textures';
import { clamp, lerp, mulberry32 } from '../utils/math';

interface SkyStarSeed {
  sprite: Sprite;
  flare?: Sprite;
  baseScale: number;
  twinkleFreq: number;
  phase: number;
  igniteOrder: number; // 0..1 radial ignition delay
}

interface AmbientDustSeed {
  sprite: Sprite;
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  freq: number;
  phase: number;
  amp: number;
  baseScale: number;
  baseAlpha: number;
}

interface TrailSparkSeed {
  sprite: Sprite;
  lifePeriod: number;
  timeOffset: number;
  vx: number;
  vy: number;
  curlFreq: number;
  curlAmp: number;
  baseScale: number;
  tint: number;
}

/**
 * Pure analytical trajectory helper for the ascending star (Scenes 4 & 5)
 * so comet trail sparks can deterministically evaluate past spawn positions at ANY frame N.
 */
export function evaluateStarAscentWorldPos(t: number, originX = 105, originY = 12): { x: number; y: number } {
  if (t <= 21.0) return { x: originX, y: originY };
  const u = clamp((t - 21.0) / 3.2, 0, 1);
  // Cubic acceleration launch + gentle graceful S-weave
  const riseEase = u < 0.65
    ? Math.pow(u / 0.65, 2.05) * 0.72
    : 0.72 + (1 - Math.pow(1 - (u - 0.65) / 0.35, 1.8)) * 0.28;
  const y = lerp(originY, -2120, riseEase);
  const x = originX + Math.sin(u * Math.PI * 2.2) * 58 * Math.sin(u * Math.PI);
  return { x, y };
}

export class ParticleSystem {
  public readonly skyStarsLayer = new Container();
  public readonly actionSparksLayer = new Container();
  public readonly foregroundDustLayer = new Container();

  private readonly skyStars: SkyStarSeed[] = [];
  private readonly dustMotes: AmbientDustSeed[] = [];
  private readonly trailSparks: TrailSparkSeed[] = [];

  constructor(textures: ProceduralTextures) {
    const rng = mulberry32(9901);

    // 360 deterministic celestial stars across Sky Layer 0
    const breakCenterX = 70;
    const breakCenterY = -420;
    for (let i = 0; i < 360; i++) {
      const sp = new Sprite(textures.spark);
      sp.anchor.set(0.5);
      const sx = (rng() - 0.5) * 2800;
      const sy = -1020 + rng() * 1160;
      sp.position.set(sx, sy);

      const isHero = i < 24;
      const baseScale = isHero ? 0.28 + rng() * 0.25 : 0.06 + rng() * 0.14;
      const palette = [0xffffff, 0xc9ecff, 0xffe4b8, 0x99d6ff];
      sp.tint = palette[Math.floor(rng() * palette.length)];
      this.skyStarsLayer.addChild(sp);

      let flare: Sprite | undefined;
      if (isHero) {
        flare = new Sprite(textures.flareCross);
        flare.anchor.set(0.5);
        flare.position.set(sx, sy);
        flare.blendMode = 'add';
        flare.tint = sp.tint;
        this.skyStarsLayer.addChild(flare);
      }

      const dist = Math.hypot(sx - breakCenterX, sy - breakCenterY);
      this.skyStars.push({
        sprite: sp,
        flare,
        baseScale,
        twinkleFreq: 1.4 + rng() * 3.2,
        phase: rng() * Math.PI * 2,
        igniteOrder: clamp(dist / 1650 + rng() * 0.12, 0, 1),
      });
    }

    // 70 atmospheric dust motes drifting across Foreground Layer 5
    for (let i = 0; i < 70; i++) {
      const sp = new Sprite(textures.spark);
      sp.anchor.set(0.5);
      sp.blendMode = 'add';
      sp.tint = rng() > 0.3 ? 0xb4d7f5 : 0xffdfad;
      this.foregroundDustLayer.addChild(sp);

      this.dustMotes.push({
        sprite: sp,
        x0: (rng() - 0.5) * 2400,
        y0: -900 + rng() * 1500,
        vx: 14 + rng() * 24,
        vy: -12 + (rng() - 0.5) * 18,
        freq: 0.7 + rng() * 1.4,
        phase: rng() * Math.PI * 2,
        amp: 14 + rng() * 28,
        baseScale: 0.07 + rng() * 0.14,
        baseAlpha: 0.14 + rng() * 0.26,
      });
    }

    // 95 analytical magical / comet-trail sparks attached to the star's motion
    for (let i = 0; i < 95; i++) {
      const sp = new Sprite(textures.spark);
      sp.anchor.set(0.5);
      sp.blendMode = 'add';
      const tint = i % 3 === 0 ? 0xfff3c4 : i % 3 === 1 ? 0x8de8ff : 0xffffff;
      sp.tint = tint;
      this.actionSparksLayer.addChild(sp);

      this.trailSparks.push({
        sprite: sp,
        lifePeriod: 0.55 + rng() * 0.85,
        timeOffset: rng() * 2.0,
        vx: (rng() - 0.5) * 95,
        vy: -25 + (rng() - 0.35) * 110,
        curlFreq: 3.5 + rng() * 5.0,
        curlAmp: 8 + rng() * 22,
        baseScale: 0.11 + rng() * 0.24,
        tint,
      });
    }
  }

  public update(params: {
    t: number;
    skyStarsAlpha: number;
    skyWarmth: number;
    starWorldX: number;
    starWorldY: number;
    starIntensity: number;
    trailIntensity: number;
    camY: number;
  }): void {
    const {
      t,
      skyStarsAlpha,
      skyWarmth,
      starWorldX,
      starWorldY,
      starIntensity,
      trailIntensity,
      camY,
    } = params;

    // 1. Staggered radial starfield ignition & twinkle (Layer 0)
    this.skyStarsLayer.visible = skyStarsAlpha > 0.002;
    if (this.skyStarsLayer.visible) {
      for (const s of this.skyStars) {
        const localVis = clamp((skyStarsAlpha - s.igniteOrder * 0.65) / 0.35, 0, 1);
        const twinkle = 0.62 + 0.38 * Math.sin(t * s.twinkleFreq + s.phase);
        const a = localVis * twinkle;
        s.sprite.alpha = a;
        s.sprite.scale.set(s.baseScale * (0.85 + 0.25 * twinkle));
        if (s.flare) {
          s.flare.alpha = a * 0.52;
          s.flare.scale.set(s.baseScale * 0.45 * (0.8 + 0.3 * twinkle));
          s.flare.rotation = t * 0.12 + s.phase;
        }
      }
    }

    // 2. Ambient dust motes in Layer 5 (respond to sky warmth & star energy)
    for (const d of this.dustMotes) {
      const px = ((((d.x0 + d.vx * t + Math.sin(t * d.freq + d.phase) * d.amp) + 1200) % 2400) + 2400) % 2400 - 1200;
      const pyRaw = d.y0 + d.vy * t + Math.cos(t * d.freq * 0.8 + d.phase) * d.amp * 0.6;
      const py = camY + (((((pyRaw - camY) + 700) % 1400) + 1400) % 1400) - 700;
      d.sprite.position.set(px, py);
      d.sprite.scale.set(d.baseScale * (1 + skyWarmth * 0.35));
      d.sprite.alpha = d.baseAlpha * (0.65 + 0.35 * Math.sin(t * d.freq + d.phase)) * (0.6 + skyWarmth * 0.55);
    }

    // 3. Analytical magical & comet-trail sparks (100% deterministic at any frame N)
    const activeTrail = t >= 21.0 && t <= 24.8 ? trailIntensity : 0;
    for (let i = 0; i < this.trailSparks.length; i++) {
      const p = this.trailSparks[i];
      const cyclePos = (t + p.timeOffset) % p.lifePeriod;
      const u = cyclePos / p.lifePeriod; // 0..1 age
      const tSpawn = t - cyclePos;

      if (activeTrail > 0.05 && tSpawn >= 21.0) {
        // Spawn cleanly along the exact past star trajectory!
        const origin = evaluateStarAscentWorldPos(tSpawn);
        const drag = 1 - u * 0.35;
        const sx =
          origin.x +
          p.vx * cyclePos * drag +
          Math.sin(cyclePos * p.curlFreq + i) * p.curlAmp * u;
        const sy =
          origin.y +
          (p.vy + 140) * cyclePos * drag + // downward wake drift
          Math.cos(cyclePos * p.curlFreq * 0.8 + i) * p.curlAmp * u;

        p.sprite.position.set(sx, sy);
        p.sprite.scale.set(p.baseScale * (1.2 - u * 0.9) * (0.7 + activeTrail * 0.6));
        p.sprite.alpha = Math.sin(u * Math.PI) * activeTrail * 0.92;
      } else {
        // Gentle drifting magical motes around the lantern / resting star (Scenes 2–4 & 6)
        const riseSpeed = 24 + (i % 7) * 6;
        const spread = 14 + starIntensity * 22;
        const sx = starWorldX + Math.sin(t * 2.1 + i * 1.3) * spread * u + p.vx * 0.14 * cyclePos;
        const sy = starWorldY - riseSpeed * cyclePos + Math.cos(t * 1.7 + i) * 6;

        p.sprite.position.set(sx, sy);
        p.sprite.scale.set(p.baseScale * 0.6 * (1 - u * 0.7));
        p.sprite.alpha = Math.sin(u * Math.PI) * clamp(starIntensity * 0.45, 0.04, 0.75);
      }
    }
  }
}
