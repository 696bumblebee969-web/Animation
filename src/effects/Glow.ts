import { Container, Graphics, Sprite } from 'pixi.js';
import { ProceduralTextures } from './Textures';
import { clamp, lerp } from '../utils/math';

export class StarVisualRig {
  public readonly container = new Container();
  private readonly outerHalo: Sprite;
  private readonly innerHalo: Sprite;
  private readonly flare: Sprite;
  private readonly coreGraphic = new Graphics();
  private readonly shockwaveGraphic = new Graphics();
  private readonly skyBurstGraphic = new Graphics();

  constructor(textures: ProceduralTextures) {
    this.outerHalo = new Sprite(textures.glowSoft);
    this.outerHalo.anchor.set(0.5);
    this.outerHalo.blendMode = 'add';

    this.innerHalo = new Sprite(textures.glowWarm);
    this.innerHalo.anchor.set(0.5);
    this.innerHalo.blendMode = 'add';

    this.flare = new Sprite(textures.flareCross);
    this.flare.anchor.set(0.5);
    this.flare.blendMode = 'add';

    this.container.addChild(
      this.outerHalo,
      this.innerHalo,
      this.flare,
      this.coreGraphic,
      this.shockwaveGraphic,
      this.skyBurstGraphic
    );
  }

  public update(params: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    intensity: number;
    pulseRate: number;
    pulseAmp: number;
    burstProgress: number;
    skyBurstProgress: number;
    t: number;
  }): void {
    const {
      x,
      y,
      scaleX,
      scaleY,
      rotation,
      intensity,
      pulseRate,
      pulseAmp,
      burstProgress,
      skyBurstProgress,
      t,
    } = params;

    this.container.position.set(x, y);

    // Organic dual-harmonic breathing pulse + subtle dying flicker when weak
    const breath =
      Math.sin(t * pulseRate * Math.PI * 2) * 0.65 +
      Math.sin(t * pulseRate * Math.PI * 4.3 + 1.1) * 0.35;
    const microFlicker =
      intensity < 0.7 ? Math.sin(t * 27.0) * Math.sin(t * 11.7) * 0.08 : 0;
    const eff = Math.max(0.05, intensity + breath * pulseAmp + microFlicker);

    this.outerHalo.scale.set((0.42 + eff * 0.55) * scaleX, (0.42 + eff * 0.55) * scaleY);
    this.outerHalo.alpha = clamp(0.28 * eff, 0.04, 0.92);
    this.outerHalo.tint = eff > 1.0 ? 0xaeeeff : 0x72d4ff;

    this.innerHalo.scale.set((0.18 + eff * 0.28) * scaleX, (0.18 + eff * 0.28) * scaleY);
    this.innerHalo.alpha = clamp(0.4 * eff, 0.08, 0.95);
    this.innerHalo.tint = 0xfff0c2;

    this.flare.scale.set((0.14 + eff * 0.35) * scaleX, (0.14 + eff * 0.35) * scaleY);
    this.flare.rotation = rotation + t * 0.25;
    this.flare.alpha = clamp((eff - 0.15) * 0.65, 0, 0.95);

    // Crystalline diamond-star core
    this.coreGraphic.clear();
    const coreR = (3.4 + eff * 4.2);
    this.coreGraphic.scale.set(scaleX, scaleY);
    this.coreGraphic.rotation = rotation;

    // 4-point subtle star silhouette + bright white heart
    this.coreGraphic
      .moveTo(0, -coreR * 1.9)
      .quadraticCurveTo(coreR * 0.28, -coreR * 0.28, coreR * 1.75, 0)
      .quadraticCurveTo(coreR * 0.28, coreR * 0.28, 0, coreR * 1.9)
      .quadraticCurveTo(-coreR * 0.28, coreR * 0.28, -coreR * 1.75, 0)
      .quadraticCurveTo(-coreR * 0.28, -coreR * 0.28, 0, -coreR * 1.9)
      .closePath()
      .fill({ color: 0xe6fbff, alpha: clamp(0.7 + eff * 0.3, 0, 1) });

    this.coreGraphic
      .circle(0, 0, coreR * 0.68)
      .fill({ color: 0xffffff, alpha: 0.98 });

    // Scene 4 expanding launch shockwave rings
    this.shockwaveGraphic.clear();
    if (burstProgress > 0.001 && burstProgress < 0.999) {
      const e = 1 - Math.pow(1 - burstProgress, 3);
      const r1 = lerp(12, 520, e);
      const a1 = (1 - burstProgress) * 0.72;
      this.shockwaveGraphic
        .circle(0, 0, r1)
        .stroke({ width: lerp(10, 1.5, burstProgress), color: 0x9ef0ff, alpha: a1 });

      const r2 = lerp(6, 310, Math.pow(burstProgress, 0.7));
      this.shockwaveGraphic
        .circle(0, 0, r2)
        .stroke({ width: lerp(6, 1, burstProgress), color: 0xfff2c6, alpha: a1 * 0.85 });
    }

    // Scene 5 cloud-piercing celestial nova ring
    this.skyBurstGraphic.clear();
    if (skyBurstProgress > 0.001 && skyBurstProgress < 0.999) {
      const e = 1 - Math.pow(1 - skyBurstProgress, 2.5);
      const r = lerp(24, 1450, e);
      const alpha = (1 - skyBurstProgress) * 0.65;
      this.skyBurstGraphic
        .circle(0, 0, r)
        .stroke({ width: lerp(18, 2, skyBurstProgress), color: 0xbef4ff, alpha });
    }
  }
}
