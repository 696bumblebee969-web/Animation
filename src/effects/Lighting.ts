import { Container, Graphics, Sprite } from 'pixi.js';
import { ProceduralTextures } from './Textures';
import { clamp, lerp } from '../utils/math';

export class LightingSystem {
  public readonly groundLightLayer = new Container();
  public readonly darknessOverlay = new Graphics();
  public readonly screenBloom = new Sprite();
  public readonly vignetteSprite: Sprite;
  public readonly grainSprite: Sprite;

  private readonly starGroundPool: Sprite;
  private readonly starWarmPool: Sprite;
  private readonly streetLampPools: Sprite[] = [];

  constructor(textures: ProceduralTextures, lampPositions: Array<{ x: number; y: number }>) {
    this.starGroundPool = new Sprite(textures.glowSoft);
    this.starGroundPool.anchor.set(0.5);
    this.starGroundPool.blendMode = 'add';

    this.starWarmPool = new Sprite(textures.glowWarm);
    this.starWarmPool.anchor.set(0.5);
    this.starWarmPool.blendMode = 'add';

    this.groundLightLayer.addChild(this.starGroundPool, this.starWarmPool);

    for (const lp of lampPositions) {
      const sp = new Sprite(textures.glowWarm);
      sp.anchor.set(0.5);
      sp.position.set(lp.x, lp.y);
      sp.blendMode = 'add';
      sp.tint = 0xe8934a;
      this.groundLightLayer.addChild(sp);
      this.streetLampPools.push(sp);
    }

    this.screenBloom = new Sprite(textures.glowSoft);
    this.screenBloom.anchor.set(0.5);
    this.screenBloom.position.set(960, 540);
    this.screenBloom.blendMode = 'add';
    this.screenBloom.alpha = 0;

    this.vignetteSprite = new Sprite(textures.vignette);
    this.vignetteSprite.width = 1920;
    this.vignetteSprite.height = 1080;

    this.grainSprite = new Sprite(textures.paperGrain);
    this.grainSprite.width = 1920;
    this.grainSprite.height = 1080;
    this.grainSprite.alpha = 0.22;
  }

  public update(params: {
    starWorldX: number;
    starWorldY: number;
    starIntensity: number;
    ambientDarkness: number;
    skyWarmth: number;
    bloomFlash: number;
    vignetteStrength: number;
    fadeToBlack: number;
    t: number;
    cutShotIndex: number;
  }): { lampFlickers: number[] } {
    const {
      starWorldX,
      starWorldY,
      starIntensity,
      ambientDarkness,
      skyWarmth,
      bloomFlash,
      vignetteStrength,
      fadeToBlack,
      t,
      cutShotIndex,
    } = params;

    // Dynamic ground & proximity illumination from the star
    const showStreetLights = cutShotIndex < 0.5;
    this.groundLightLayer.visible = showStreetLights;

    if (showStreetLights) {
      this.starGroundPool.position.set(starWorldX, starWorldY);
      const poolScale = 0.95 + starIntensity * 1.35;
      this.starGroundPool.scale.set(poolScale);
      this.starGroundPool.alpha = clamp(0.16 + starIntensity * 0.34, 0, 0.85);
      this.starGroundPool.tint = lerp(0x52c4ff, 0xa8ecff, clamp(starIntensity * 0.5, 0, 1));

      this.starWarmPool.position.set(starWorldX, starWorldY);
      this.starWarmPool.scale.set(poolScale * 0.55);
      this.starWarmPool.alpha = clamp(starIntensity * 0.28, 0, 0.65);
    }

    // Flickering tungsten streetlamps (seeded deterministic electrical hum)
    const lampFlickers: number[] = [];
    for (let i = 0; i < this.streetLampPools.length; i++) {
      const sp = this.streetLampPools[i];
      const baseFlicker =
        0.78 +
        0.14 * Math.sin(t * (7.2 + i * 2.1) + i * 1.9) +
        0.08 * Math.sin(t * (29.0 + i * 7.3));
      // Dramatic sputter in Scene 1 around t=1.6s and t=3.8s
      const dip1 = Math.exp(-Math.pow((t - (1.65 + i * 0.9)) * 7, 2)) * 0.65;
      const dip2 = Math.exp(-Math.pow((t - (3.85 - i * 0.4)) * 9, 2)) * 0.55;
      const lampPower = clamp(
        (baseFlicker - dip1 - dip2) * (1 - ambientDarkness * 0.72) + skyWarmth * 0.35,
        0.05,
        1.15
      );
      lampFlickers.push(lampPower);
      sp.scale.set(1.15 + lampPower * 0.35);
      sp.alpha = lampPower * 0.24;
    }

    // Chiaroscuro darkness + final fade-to-black screen overlay
    this.darknessOverlay.clear();
    const darkAlpha = clamp(ambientDarkness * 0.48 * (1 - skyWarmth * 0.75), 0, 0.6);
    if (darkAlpha > 0.005) {
      this.darknessOverlay
        .rect(0, 0, 1920, 1080)
        .fill({ color: 0x03060f, alpha: darkAlpha });
    }
    if (fadeToBlack > 0.001) {
      this.darknessOverlay
        .rect(0, 0, 1920, 1080)
        .fill({ color: 0x020308, alpha: clamp(fadeToBlack, 0, 1) });
    }

    // Additive screen bloom during release burst & cloud breakthrough
    this.screenBloom.alpha = clamp(bloomFlash * 0.85, 0, 0.9);
    this.screenBloom.scale.set(4.5 + bloomFlash * 6.0);
    this.screenBloom.tint = skyWarmth > 0.3 ? 0xffe9be : 0x9feaff;

    this.vignetteSprite.alpha = clamp(vignetteStrength, 0.15, 0.98);
    // Subtle deterministic film-grain micro-jitter
    this.grainSprite.position.set(
      Math.sin(t * 143.7) * 6,
      Math.cos(t * 197.3) * 6
    );

    return { lampFlickers };
  }
}
