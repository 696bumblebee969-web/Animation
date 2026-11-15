import { Container, Sprite } from 'pixi.js';
import { ProceduralTextures } from './Textures';
import { clamp, lerp, mulberry32 } from '../utils/math';

interface CloudPuffNode {
  sprite: Sprite;
  baseX: number;
  baseY: number;
  baseScale: number;
  side: -1 | 1; // -1 parts left, +1 parts right
  driftSpeed: number;
  bobPhase: number;
}

export class FogAndCloudsSystem {
  public readonly cloudDeckLayer = new Container();
  public readonly streetFogLayer = new Container();
  public readonly foregroundFogLayer = new Container();

  private readonly clouds: CloudPuffNode[] = [];
  private readonly streetMistSprites: Array<{ sprite: Sprite; baseX: number; speed: number; baseAlpha: number }> = [];
  private readonly fgMistSprites: Array<{ sprite: Sprite; baseX: number; speed: number; baseAlpha: number }> = [];

  constructor(textures: ProceduralTextures) {
    const rng = mulberry32(7711);

    // Build thick multi-layered storm cloud ceiling in Layer 1 space (y: -660..-320)
    const count = 26;
    for (let i = 0; i < count; i++) {
      const tex = textures.cloudPuffs[i % textures.cloudPuffs.length];
      const sp = new Sprite(tex);
      sp.anchor.set(0.5);

      const u = i / (count - 1);
      const baseX = lerp(-1350, 1350, u) + (rng() - 0.5) * 140;
      const baseY = -510 + Math.sin(u * Math.PI * 3) * 65 + (rng() - 0.5) * 110;
      const baseScale = 1.05 + rng() * 1.15;
      sp.scale.set(baseScale * (rng() > 0.5 ? 1 : -1), baseScale);
      sp.position.set(baseX, baseY);

      this.cloudDeckLayer.addChild(sp);
      this.clouds.push({
        sprite: sp,
        baseX,
        baseY,
        baseScale,
        side: baseX < 90 ? -1 : 1,
        driftSpeed: 10 + rng() * 16,
        bobPhase: rng() * Math.PI * 2,
      });
    }

    // Mid-street drifting fog layers (Layer 2/3 boundary)
    for (let i = 0; i < 6; i++) {
      const sp = new Sprite(textures.fogBand);
      sp.anchor.set(0.5);
      const bx = -1200 + i * 520;
      sp.position.set(bx, 185 + (i % 2) * 32);
      sp.scale.set(1.4 + (i % 3) * 0.25, 0.8 + (i % 2) * 0.25);
      this.streetFogLayer.addChild(sp);
      this.streetMistSprites.push({
        sprite: sp,
        baseX: bx,
        speed: 22 + i * 5,
        baseAlpha: 0.24 + (i % 2) * 0.08,
      });
    }

    // Foreground fast-moving mist wisps (Layer 5)
    for (let i = 0; i < 4; i++) {
      const sp = new Sprite(textures.fogBand);
      sp.anchor.set(0.5);
      const bx = -1100 + i * 740;
      sp.position.set(bx, 290 + (i % 2) * 65);
      sp.scale.set(1.9, 1.1);
      this.foregroundFogLayer.addChild(sp);
      this.fgMistSprites.push({
        sprite: sp,
        baseX: bx,
        speed: 44 + i * 9,
        baseAlpha: 0.2,
      });
    }
  }

  public update(params: {
    t: number;
    cloudSplit: number;
    fogDensity: number;
    skyWarmth: number;
    starWorldX: number;
    starWorldY: number;
    starIntensity: number;
    cutShotIndex: number;
  }): void {
    const { t, cloudSplit, fogDensity, skyWarmth, cutShotIndex } = params;

    // Cloud deck animation + physical parting separation in Scenes 4 & 5
    const splitEase = cloudSplit * cloudSplit * (3 - 2 * cloudSplit);
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      const ambientDrift = ((t * c.driftSpeed) % 360) - 180;
      const distFromCenter = Math.abs(c.baseX - 90);
      const centerWeight = clamp(1 - distFromCenter / 1200, 0.25, 1);

      const partX = c.side * splitEase * (460 + centerWeight * 580);
      const partY = -splitEase * (80 + (1 - centerWeight) * 90) + Math.sin(t * 0.7 + c.bobPhase) * 9;

      c.sprite.position.set(c.baseX + ambientDrift * 0.3 + partX, c.baseY + partY);
      c.sprite.rotation = c.side * splitEase * 0.22;
      c.sprite.scale.set(
        Math.sign(c.sprite.scale.x || 1) * c.baseScale * (1 - splitEase * 0.14),
        c.baseScale * (1 - splitEase * 0.22)
      );

      // Clouds catch warm silver-azure rim tint as sky opens
      c.sprite.tint = skyWarmth > 0.15 ? 0x9bb8e8 : 0xffffff;
      c.sprite.alpha = clamp((0.94 - splitEase * 0.42 * centerWeight) * (cutShotIndex > 0.5 ? 0.45 : 1), 0.12, 0.95);
    }

    // Drifting street mist
    this.streetFogLayer.visible = cutShotIndex < 0.5;
    for (const m of this.streetMistSprites) {
      const span = 3120;
      const wrapped = (((m.baseX + t * m.speed + 1560) % span) + span) % span - 1560;
      m.sprite.x = wrapped;
      m.sprite.alpha = m.baseAlpha * fogDensity * (1 - skyWarmth * 0.35);
      m.sprite.tint = skyWarmth > 0.3 ? 0x9ec9f2 : 0x8ea3bf;
    }

    // Foreground mist
    for (const m of this.fgMistSprites) {
      const span = 3200;
      const wrapped = (((m.baseX + t * m.speed + 1600) % span) + span) % span - 1600;
      m.sprite.x = wrapped;
      m.sprite.alpha = m.baseAlpha * fogDensity * (cutShotIndex > 0.5 ? 0.35 : 1);
    }
  }
}
