import { Container, FillGradient, Graphics } from 'pixi.js';
import { clamp, lerp, mulberry32 } from '../utils/math';

export interface CityWindowRef {
  graphic: Graphics;
  threshold: number;
}

export interface LampNode {
  container: Container;
  bulb: Graphics;
  x: number;
  y: number;
}

export class CityWorld {
  public readonly skyLayer = new Container();
  public readonly distantLayer = new Container();
  public readonly midgroundLayer = new Container();
  public readonly streetLayer = new Container();
  public readonly rooftopLayer = new Container();
  public readonly foregroundLayer = new Container();

  public readonly streetLanternAnchor = new Container();
  private readonly lanternBody = new Graphics();
  private readonly lanternDoor = new Graphics();
  private readonly lanternGlowFill = new Graphics();

  public readonly lamps: LampNode[] = [];
  public readonly lampPositions: Array<{ x: number; y: number }> = [];

  private readonly skyNightGraphics = new Graphics();
  private readonly skyWarmGraphics = new Graphics();
  private readonly distantWindows: CityWindowRef[] = [];
  private readonly midWindows: CityWindowRef[] = [];
  private readonly streetLitBounce = new Graphics();
  private readonly rooftopCometTrail = new Graphics();
  private readonly rooftopWindows: CityWindowRef[] = [];

  constructor() {
    this.buildSky();
    this.buildDistantSkyline();
    this.buildMidgroundCity();
    this.buildStreetPlane();
    this.buildLanternRig();
    this.buildRooftopFinalSet();
    this.buildForegroundFrames();
  }

  private buildSky(): void {
    // Oversized sky vault so vertical camera pans to -1750 never clip edges
    const nightGrad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 0x040711 },
        { offset: 0.45, color: 0x0a1020 },
        { offset: 0.85, color: 0x131b2e },
        { offset: 1, color: 0x1b2236 },
      ],
    });
    this.skyNightGraphics.rect(-1800, -1400, 3600, 2600).fill(nightGrad);

    const warmGrad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 0x091633 },
        { offset: 0.42, color: 0x132c57 },
        { offset: 0.78, color: 0x1f4978 },
        { offset: 1, color: 0x3b638c },
      ],
    });
    this.skyWarmGraphics.rect(-1800, -1400, 3600, 2600).fill(warmGrad);
    this.skyWarmGraphics.alpha = 0;

    this.skyLayer.addChild(this.skyNightGraphics, this.skyWarmGraphics);
  }

  private buildDistantSkyline(): void {
    const rng = mulberry32(3104);
    const g = new Graphics();
    // Distant silhouetted ridges & spires (Layer 1, y base ~ +280)
    let x = -1650;
    while (x < 1650) {
      const w = 65 + rng() * 110;
      const h = 140 + rng() * 260;
      const yTop = 280 - h;
      const roofType = rng();

      g.moveTo(x, 420).lineTo(x, yTop);
      if (roofType < 0.35) {
        // Steep gothic gable + spire
        g.lineTo(x + w * 0.5, yTop - 55).lineTo(x + w, yTop);
      } else if (roofType < 0.7) {
        // Stepped townhouse roof
        g.lineTo(x + w * 0.25, yTop - 22)
          .lineTo(x + w * 0.75, yTop - 22)
          .lineTo(x + w, yTop);
      } else {
        g.lineTo(x + w, yTop);
      }
      g.lineTo(x + w, 420).closePath().fill({ color: 0x0b111f });

      // Tiny far windows that light up in Scene 5
      const cols = Math.max(1, Math.floor(w / 24));
      const rows = Math.max(2, Math.floor(h / 34));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rng() > 0.48) continue;
          const wg = new Graphics();
          wg.rect(x + 10 + c * 20, yTop + 18 + r * 28, 7, 11).fill({ color: 0xffcf7d });
          wg.alpha = 0;
          this.distantLayer.addChild(wg);
          this.distantWindows.push({ graphic: wg, threshold: rng() * 0.8 });
        }
      }
      x += w - 4;
    }
    this.distantLayer.addChildAt(g, 0);
  }

  private buildMidgroundCity(): void {
    const rng = mulberry32(5521);
    const facadeGroup = new Graphics();

    const buildings = [
      { x: -1250, w: 260, h: 490, gable: 110 },
      { x: -990, w: 220, h: 420, gable: 85 },
      { x: -760, w: 280, h: 560, gable: 140 },
      { x: -460, w: 240, h: 470, gable: 95 },
      { x: -190, w: 290, h: 520, gable: 120 },
      { x: 110, w: 265, h: 460, gable: 100 },
      { x: 390, w: 310, h: 580, gable: 145 },
      { x: 715, w: 255, h: 450, gable: 90 },
      { x: 985, w: 290, h: 510, gable: 115 },
    ];

    for (const b of buildings) {
      const baseY = 230;
      const topY = baseY - b.h;
      const midX = b.x + b.w * 0.5;

      // Main silhouette
      facadeGroup
        .moveTo(b.x, baseY + 60)
        .lineTo(b.x, topY)
        .lineTo(midX, topY - b.gable)
        .lineTo(b.x + b.w, topY)
        .lineTo(b.x + b.w, baseY + 60)
        .closePath()
        .fill({ color: 0x0f1626 });

      // Subtle darker masonry left shadow & chimney
      facadeGroup
        .rect(b.x, topY, b.w * 0.24, b.h + 60)
        .fill({ color: 0x0b101d, alpha: 0.7 });

      // Chimney & crooked pot
      const chX = b.x + b.w * 0.22;
      const chY = topY - b.gable * 0.55 - 48;
      facadeGroup.rect(chX, chY, 24, 64).fill({ color: 0x0c1220 });
      facadeGroup.rect(chX - 3, chY - 5, 30, 7).fill({ color: 0x161f33 });

      // Overhanging roof eaves trim
      facadeGroup
        .moveTo(b.x - 10, topY + 6)
        .lineTo(midX, topY - b.gable - 8)
        .lineTo(b.x + b.w + 10, topY + 6)
        .stroke({ width: 6, color: 0x182238 });

      // Arched multi-pane windows
      const cols = 3;
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = b.x + 36 + c * ((b.w - 72) / (cols - 1 || 1)) - 12;
          const wy = topY + 46 + r * 86;
          // Recessed dark window frame
          facadeGroup
            .roundRect(wx, wy, 24, 42, 10)
            .fill({ color: 0x070b14 })
            .stroke({ width: 2, color: 0x1c2740 });

          // Illuminated warm glass pane (fades in during Scene 5)
          if (rng() > 0.28) {
            const wg = new Graphics();
            wg.roundRect(wx + 2, wy + 2, 20, 38, 8).fill({ color: 0xffc66e });
            // Window muntin cross
            wg.rect(wx + 11, wy + 2, 2, 38).fill({ color: 0x18131a, alpha: 0.75 });
            wg.rect(wx + 2, wy + 20, 20, 2).fill({ color: 0x18131a, alpha: 0.75 });
            wg.alpha = 0;
            this.midgroundLayer.addChild(wg);
            this.midWindows.push({ graphic: wg, threshold: 0.1 + rng() * 0.8 });
          }
        }
      }
    }

    this.midgroundLayer.addChildAt(facadeGroup, 0);

    // Ornate streetlamps along the curb
    const lampXs = [-490, -135, 315, 760];
    for (const lx of lampXs) {
      const lc = new Container();
      lc.position.set(lx, 224);
      const post = new Graphics();
      post
        .rect(-6, -18, 12, 18)
        .fill({ color: 0x0a0f1a })
        .rect(-3.5, -210, 7, 195)
        .fill({ color: 0x101728 })
        .moveTo(-14, -210)
        .lineTo(14, -210)
        .lineTo(10, -238)
        .lineTo(-10, -238)
        .closePath()
        .fill({ color: 0x131b2e })
        .moveTo(-14, -238)
        .lineTo(0, -254)
        .lineTo(14, -238)
        .closePath()
        .fill({ color: 0x0d1322 });

      const bulb = new Graphics();
      bulb.roundRect(-7, -234, 14, 20, 3).fill({ color: 0xffbd6b });

      lc.addChild(post, bulb);
      this.midgroundLayer.addChild(lc);
      this.lamps.push({ container: lc, bulb, x: lx, y: 224 - 224 });
      this.lampPositions.push({ x: lx, y: -12 });
    }
  }

  private buildStreetPlane(): void {
    const g = new Graphics();
    // Wet cobblestone road base (y >= 220)
    const roadGrad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 0x101728 },
        { offset: 0.35, color: 0x0a0f1c },
        { offset: 1, color: 0x050810 },
      ],
    });
    g.rect(-1600, 220, 3200, 520).fill(roadGrad);

    // Curb edge & cobblestone texture strokes
    g.rect(-1600, 217, 3200, 5).fill({ color: 0x1b263d });
    const rng = mulberry32(8123);
    for (let i = 0; i < 120; i++) {
      const cx = (rng() - 0.5) * 2600;
      const cy = 228 + rng() * 140;
      const cw = 26 + rng() * 44;
      g.roundRect(cx, cy, cw, 7 + rng() * 5, 3).fill({
        color: 0x1a253c,
        alpha: 0.35 + rng() * 0.25,
      });
    }

    // Old weathered stone stoop beside the abandoned lantern (x ~ 165)
    g.roundRect(130, 198, 95, 26, 4).fill({ color: 0x151e31 });
    g.roundRect(142, 182, 70, 20, 3).fill({ color: 0x1a253b });

    this.streetLayer.addChild(g, this.streetLitBounce);
  }

  private buildLanternRig(): void {
    // Detailed hand-crafted iron lantern centered near its base (0, 0)
    // Bail handle sits around (0, -34)
    this.lanternBody
      // Base plinth
      .roundRect(-13, -5, 26, 6, 2)
      .fill({ color: 0x182236 })
      // Corner iron struts
      .rect(-11, -28, 3, 24)
      .fill({ color: 0x1a263c })
      .rect(8, -28, 3, 24)
      .fill({ color: 0x1a263c })
      // Cap & roof finial
      .moveTo(-14, -28)
      .lineTo(14, -28)
      .lineTo(9, -36)
      .lineTo(-9, -36)
      .closePath()
      .fill({ color: 0x141d2e })
      .circle(0, -38, 3)
      .fill({ color: 0x22304d })
      // Top carrying ring
      .circle(0, -43, 5)
      .stroke({ width: 2.2, color: 0x2d3f63 });

    // Hinged front glass door pivoting around left strut x = -9
    this.lanternDoor.position.set(-9, -16);
    this.lanternDoor
      .rect(0, -11, 18, 22)
      .fill({ color: 0x7fd8ff, alpha: 0.16 })
      .stroke({ width: 1.8, color: 0x2c3e61 });

    this.lanternGlowFill.roundRect(-8, -26, 16, 20, 2).fill({ color: 0x8ae6ff, alpha: 0.35 });

    this.streetLanternAnchor.addChild(this.lanternGlowFill, this.lanternBody, this.lanternDoor);
    this.streetLayer.addChild(this.streetLanternAnchor);
  }

  private buildRooftopFinalSet(): void {
    const rng = mulberry32(9007);
    // Distant warmly glowing city skyline below the rooftop (Scene 6)
    const horizon = new Graphics();
    let x = -1100;
    while (x < 1100) {
      const w = 48 + rng() * 75;
      const h = 90 + rng() * 165;
      const yTop = 270 - h;
      horizon
        .moveTo(x, 480)
        .lineTo(x, yTop)
        .lineTo(x + w * 0.5, yTop - 22)
        .lineTo(x + w, yTop)
        .lineTo(x + w, 480)
        .closePath()
        .fill({ color: 0x0c1528 });

      const cols = Math.max(1, Math.floor(w / 18));
      const rows = Math.max(2, Math.floor(h / 26));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rng() > 0.55) continue;
          const wg = new Graphics();
          wg.rect(x + 8 + c * 15, yTop + 14 + r * 22, 5, 8).fill({ color: 0xffcd78 });
          wg.alpha = 0.85;
          this.rooftopLayer.addChild(wg);
          this.rooftopWindows.push({ graphic: wg, threshold: 0 });
        }
      }
      x += w - 3;
    }
    this.rooftopLayer.addChildAt(horizon, 0);

    // Sweeping foreground slate rooftop where child stands at (-260, +145)
    const roof = new Graphics();
    roof
      .moveTo(-1150, 360)
      .lineTo(-420, 145)
      .lineTo(-110, 145)
      .lineTo(280, 290)
      .lineTo(280, 560)
      .lineTo(-1150, 560)
      .closePath()
      .fill({ color: 0x090f1d });

    // Subtle moonlight / starlight rim on roof ridge
    roof
      .moveTo(-420, 145)
      .lineTo(-110, 145)
      .lineTo(280, 290)
      .stroke({ width: 3, color: 0x4b74a8, alpha: 0.7 });

    // Brick chimney silhouette on left edge (-390)
    roof.rect(-405, 58, 48, 92).fill({ color: 0x0b1222 });
    roof.rect(-412, 50, 62, 10).fill({ color: 0x15213a });
    roof.rect(-394, 34, 12, 18).fill({ color: 0x10192d });
    roof.rect(-374, 38, 12, 14).fill({ color: 0x10192d });

    this.rooftopLayer.addChild(this.rooftopCometTrail, roof);
    this.rooftopLayer.visible = false;
  }

  private buildForegroundFrames(): void {
    const fg = new Graphics();
    // Left wrought-iron gate & framing eaves (outside central action zone so Scene 3 stays clear!)
    fg.rect(-1320, -450, 230, 1050).fill({ color: 0x04070e });
    for (let i = 0; i < 6; i++) {
      const px = -1070 + i * 54;
      fg.rect(px, 20, 11, 440).fill({ color: 0x050811 });
      fg.moveTo(px - 6, 20).lineTo(px + 5.5, -6).lineTo(px + 17, 20).closePath().fill({ color: 0x050811 });
    }
    fg.rect(-1085, 85, 315, 10).fill({ color: 0x050811 });

    // Right foreground dark eave / lamp silhouette
    fg.moveTo(1060, -520).lineTo(1380, -520).lineTo(1380, 620).lineTo(1160, 620).lineTo(1140, -180).closePath().fill({ color: 0x04070e });

    this.foregroundLayer.addChild(fg);
  }

  public update(params: {
    skyWarmth: number;
    cityLightsOn: number;
    lanternDoorOpen: number;
    lanternGlow: number;
    starWorldX: number;
    starWorldY: number;
    starIntensity: number;
    lampFlickers: number[];
    cutShotIndex: number;
    cometProgress: number;
  }): void {
    const {
      skyWarmth,
      cityLightsOn,
      lanternDoorOpen,
      lanternGlow,
      starWorldX,
      starWorldY,
      starIntensity,
      lampFlickers,
      cutShotIndex,
      cometProgress,
    } = params;

    this.skyWarmGraphics.alpha = clamp(skyWarmth, 0, 1);

    const onStreet = cutShotIndex < 0.5;
    this.distantLayer.visible = onStreet;
    this.midgroundLayer.visible = onStreet;
    this.streetLayer.visible = onStreet;
    this.foregroundLayer.visible = onStreet;
    this.rooftopLayer.visible = !onStreet;

    // Lantern door hinges open in Scene 4
    this.lanternDoor.scale.x = lerp(1, -0.35, lanternDoorOpen);
    this.lanternGlowFill.alpha = clamp(lanternGlow, 0.05, 1);

    // Street lamp bulbs
    for (let i = 0; i < this.lamps.length; i++) {
      this.lamps[i].bulb.alpha = clamp(lampFlickers[i] ?? 0.6, 0.1, 1);
    }

    // Dynamic cobblestone specular reflection directly below the star!
    this.streetLitBounce.clear();
    if (onStreet && starIntensity > 0.05) {
      const distFromGround = Math.max(0, 222 - starWorldY);
      const groundFalloff = clamp(1 - distFromGround / 520, 0, 1);
      const w = (28 + starIntensity * 55) * (0.4 + groundFalloff * 0.6);
      this.streetLitBounce
        .ellipse(starWorldX, 232, w, 6 + starIntensity * 4)
        .fill({ color: 0x7fd8ff, alpha: 0.28 * starIntensity * groundFalloff });
      this.streetLitBounce
        .ellipse(starWorldX, 231, w * 0.45, 3)
        .fill({ color: 0xfff2cf, alpha: 0.35 * starIntensity * groundFalloff });
    }

    // Staggered warm city window illumination (Scene 5)
    for (const w of this.distantWindows) {
      w.graphic.alpha = clamp((cityLightsOn - w.threshold) / 0.2, 0, 0.82);
    }
    for (const w of this.midWindows) {
      w.graphic.alpha = clamp((cityLightsOn - w.threshold) / 0.2, 0, 0.92);
    }

    // Scene 6 rooftop gliding star trail
    this.rooftopCometTrail.clear();
    if (!onStreet && cometProgress > 0.01) {
      const steps = 22;
      for (let i = 0; i < steps; i++) {
        const u0 = Math.max(0, cometProgress - (i + 1) * 0.014);
        const u1 = Math.max(0, cometProgress - i * 0.014);
        const p0 = getRooftopCometPos(u0);
        const p1 = getRooftopCometPos(u1);
        const alpha = (1 - i / steps) * 0.55;
        this.rooftopCometTrail
          .moveTo(p0.x, p0.y)
          .lineTo(p1.x, p1.y)
          .stroke({ width: lerp(4.5, 0.5, i / steps), color: 0xc2f0ff, alpha });
      }
    }
  }
}

export function getRooftopCometPos(u: number): { x: number; y: number } {
  const x = lerp(-460, 560, u);
  const y = -455 - Math.sin(u * Math.PI) * 95 - u * 45;
  return { x, y };
}
