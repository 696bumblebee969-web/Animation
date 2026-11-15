import { Container, Graphics } from 'pixi.js';
import { ChildState } from '../types';
import { clamp, lerp } from '../utils/math';

interface LimbSegment {
  upper: Container;
  lower: Container;
  end: Container;
}

export class CharacterAnimator {
  public readonly root = new Container();

  private readonly shadow = new Graphics();
  private readonly pelvis = new Container();
  private readonly torso = new Container();
  private readonly headPivot = new Container();

  private readonly cloakGraphics = new Graphics();
  private readonly scarfGraphics = new Graphics();
  private readonly torsoGraphics = new Graphics();
  private readonly headGraphics = new Graphics();
  private readonly hairGraphics = new Graphics();
  private readonly faceGraphics = new Graphics();
  private readonly rimLightGraphics = new Graphics();

  private readonly backLeg: LimbSegment;
  private readonly frontLeg: LimbSegment;
  private readonly backArm: LimbSegment;
  private readonly frontArm: LimbSegment;

  public readonly lanternGripPoint = new Container();

  constructor() {
    this.backLeg = this.createLeg(0x161d2e, 0x0e1320);
    this.frontLeg = this.createLeg(0x1f283d, 0x121828);
    this.backArm = this.createArm(0x212a3f, 0xd4b29e);
    this.frontArm = this.createArm(0x2d3752, 0xe7c7b3);

    this.frontArm.end.addChild(this.lanternGripPoint);
    this.lanternGripPoint.position.set(2, 6);

    // Layer hierarchy from back to front
    this.pelvis.addChild(
      this.backLeg.upper,
      this.backArm.upper,
      this.scarfGraphics,
      this.cloakGraphics,
      this.torso,
      this.frontLeg.upper,
      this.frontArm.upper
    );

    this.torso.addChild(this.torsoGraphics, this.headPivot, this.rimLightGraphics);
    this.headPivot.addChild(this.headGraphics, this.faceGraphics, this.hairGraphics);
    this.root.addChild(this.shadow, this.pelvis);

    this.drawStaticParts();
  }

  private createLeg(legColor: number, bootColor: number): LimbSegment {
    const upper = new Container();
    const lower = new Container();
    const end = new Container();

    const thighG = new Graphics().roundRect(-5, 0, 10, 26, 4).fill({ color: legColor });
    const shinG = new Graphics().roundRect(-4.2, 0, 8.4, 24, 4).fill({ color: legColor });
    const bootG = new Graphics()
      .moveTo(-5, 0)
      .lineTo(4, 0)
      .lineTo(10, 8)
      .lineTo(9, 12)
      .lineTo(-6, 12)
      .closePath()
      .fill({ color: bootColor });

    upper.addChild(thighG, lower);
    lower.position.set(0, 24);
    lower.addChild(shinG, end);
    end.position.set(0, 22);
    end.addChild(bootG);

    return { upper, lower, end };
  }

  private createArm(sleeveColor: number, handColor: number): LimbSegment {
    const upper = new Container();
    const lower = new Container();
    const end = new Container();

    const upG = new Graphics().roundRect(-4.2, 0, 8.4, 21, 4).fill({ color: sleeveColor });
    const lowG = new Graphics().roundRect(-3.6, 0, 7.2, 19, 3.5).fill({ color: sleeveColor });
    const handG = new Graphics().circle(0, 3, 4.2).fill({ color: handColor });

    upper.addChild(upG, lower);
    lower.position.set(0, 19);
    lower.addChild(lowG, end);
    end.position.set(0, 17);
    end.addChild(handG);

    return { upper, lower, end };
  }

  private drawStaticParts(): void {
    // Torso coat
    this.torsoGraphics
      .moveTo(-11, -36)
      .lineTo(11, -36)
      .lineTo(15, 6)
      .lineTo(-15, 6)
      .closePath()
      .fill({ color: 0x263149 });

    // Scarf collar wrap around neck
    this.torsoGraphics
      .roundRect(-12, -41, 24, 10, 5)
      .fill({ color: 0x8d3b49 });
  }

  public update(params: {
    child: ChildState;
    starWorldX: number;
    starWorldY: number;
    starIntensity: number;
    t: number;
  }): void {
    const { child, starWorldX, starWorldY, starIntensity, t } = params;

    this.root.position.set(child.x, child.y);
    this.root.scale.set(child.scale * child.facing, child.scale);

    // Direction from child to star (for dynamic rim lighting & facial illumination)
    const dxToStar = (starWorldX - child.x) * child.facing;
    const dyToStar = starWorldY - (child.y - 75);
    const distToStar = Math.max(20, Math.hypot(dxToStar, dyToStar));
    const starWarmLight = clamp(starIntensity * (1 - distToStar / 460), 0.04, 1);

    // Walk cycle kinematics (4-phase gait with hip bob & crouch compression)
    const phase = child.walkPhase * Math.PI * 2;
    const wb = child.walkBlend;
    const hipBob = Math.abs(Math.sin(phase)) * -5.2 * wb;
    const crouchY = child.crouch * 26;
    const basePelvisY = -56 + hipBob + crouchY;

    this.pelvis.position.set(0, basePelvisY);
    this.torso.position.set(0, 0);
    this.torso.rotation = child.bodyLean + child.crouch * 0.34 + Math.sin(t * 2.2) * 0.015;

    // Ground contact shadow
    this.shadow.clear();
    this.shadow
      .ellipse(-dxToStar * 0.04, 2, 22 + crouchY * 0.25, 5)
      .fill({ color: 0x02040a, alpha: 0.65 });

    // Leg FK with knee bend + ankle push-off
    const fStride = Math.sin(phase) * 0.56 * wb;
    const bStride = Math.sin(phase + Math.PI) * 0.56 * wb;
    const fKnee = Math.max(0, -Math.cos(phase)) * 0.72 * wb + child.crouch * 1.15;
    const bKnee = Math.max(0, -Math.cos(phase + Math.PI)) * 0.72 * wb + child.crouch * 0.95;

    this.frontLeg.upper.position.set(3, 0);
    this.frontLeg.upper.rotation = fStride - child.crouch * 0.62;
    this.frontLeg.lower.rotation = fKnee;
    this.frontLeg.end.rotation = -fStride * 0.45 - child.crouch * 0.48;

    this.backLeg.upper.position.set(-3, 0);
    this.backLeg.upper.rotation = bStride - child.crouch * 0.52;
    this.backLeg.lower.rotation = bKnee;
    this.backLeg.end.rotation = -bStride * 0.45 - child.crouch * 0.42;

    // Arm positioning: blends smoothly from walk swing -> reach -> lantern hold -> overhead lift
    const armWalkSwing = Math.sin(phase + Math.PI) * 0.48 * wb;
    const reachSh = lerp(armWalkSwing, -0.95, child.reachProgress);
    const reachElb = lerp(-0.2 - Math.max(0, armWalkSwing) * 0.35, -0.45, child.reachProgress);

    const liftSh = lerp(reachSh, -2.65, child.liftHeight);
    const liftElb = lerp(reachElb, -0.35, child.liftHeight);

    this.frontArm.upper.position.set(2, -33);
    this.frontArm.upper.rotation = liftSh + this.torso.rotation * 0.4;
    this.frontArm.lower.rotation = liftElb;
    this.frontArm.end.rotation = -liftSh * 0.25;

    // Back arm counter-balances during walk, and supports lift overhead
    const backLiftSh = lerp(-armWalkSwing, -2.35, Math.max(0, child.liftHeight - 0.35) / 0.65);
    this.backArm.upper.position.set(-3, -33);
    this.backArm.upper.rotation = backLiftSh;
    this.backArm.lower.rotation = lerp(-0.25, -0.4, child.liftHeight);

    // Head rotation & secondary tilt
    this.headPivot.position.set(0, -42);
    this.headPivot.rotation = child.headPitch - this.torso.rotation * 0.35;

    // Dynamic head & hood geometry (supports headYaw turn!)
    const yawShift = child.headYaw * 5.5;
    this.headGraphics.clear();
    // Back hood fold
    this.headGraphics
      .circle(-4 + yawShift * 0.3, -14, 18.5)
      .fill({ color: 0x20293d });
    // Face profile/3-quarter head
    this.headGraphics
      .circle(2 + yawShift * 0.45, -14, 15.5)
      .fill({ color: 0xe3c2ad });
    // Soft shadow overlay on side away from star
    this.headGraphics
      .circle(2 + yawShift * 0.45, -14, 15.5)
      .fill({ color: 0x0f172a, alpha: clamp(0.42 - starWarmLight * 0.32, 0.05, 0.45) });

    // Expressive face (eyes, blink, gaze tracking, brows, mouth)
    this.drawExpression(child, yawShift, starWarmLight, t);

    // Secondary motion: hair strands + wool scarf tail + fluttering cloak hem
    this.hairGraphics.clear();
    const hairWave1 = Math.sin(t * 4.5 + child.walkPhase * 4) * (2.5 + child.clothWind * 4.5);
    const hairWave2 = Math.cos(t * 3.8 + 1.1) * (1.8 + child.clothWind * 3.5);
    // Bangs / fringe
    this.hairGraphics
      .moveTo(-12 + yawShift * 0.5, -24)
      .quadraticCurveTo(4 + yawShift * 0.7, -33, 16 + yawShift * 0.5, -20)
      .quadraticCurveTo(6 + yawShift * 0.5, -16 + hairWave2 * 0.2, -10 + yawShift * 0.4, -12)
      .closePath()
      .fill({ color: 0x161b29 });
    // Trailing hair lock behind ear
    this.hairGraphics
      .moveTo(-11 + yawShift * 0.3, -18)
      .quadraticCurveTo(-20 - child.clothWind * 7, -8 + hairWave1 * 0.6, -16 - child.clothWind * 11, 2 + hairWave1)
      .quadraticCurveTo(-10, -2, -7 + yawShift * 0.3, -14)
      .closePath()
      .fill({ color: 0x161b29 });

    // Flowing 4-segment scarf chain lagging behind stride & breeze
    this.scarfGraphics.clear();
    const windBias = -14 * wb - 24 * child.clothWind;
    const s0x = -6;
    const s0y = -36 + this.torso.rotation * 6;
    const s1x = s0x + windBias * 0.55 - 8;
    const s1y = s0y + 10 + Math.sin(t * 5.2 - 0.6) * (3 + child.clothWind * 5);
    const s2x = s1x + windBias * 0.65 - 10;
    const s2y = s1y + 11 + Math.sin(t * 5.2 - 1.5) * (4.5 + child.clothWind * 7);
    this.scarfGraphics
      .moveTo(s0x, s0y)
      .quadraticCurveTo(s1x, s1y - 4, s2x, s2y)
      .lineTo(s2x - 3, s2y + 7)
      .quadraticCurveTo(s1x - 2, s1y + 6, s0x - 4, s0y + 8)
      .closePath()
      .fill({ color: 0x8d3b49 });

    // Coat cloak hem flapping with stride & upward blast
    this.cloakGraphics.clear();
    const hemFlare = wb * 7 + child.clothWind * 14;
    const hemWave = Math.sin(t * 6.0) * (2 + child.clothWind * 4);
    this.cloakGraphics
      .moveTo(-13, -12)
      .lineTo(13, -12)
      .lineTo(17 + hemFlare * 0.35, 14 + hemWave * 0.4)
      .quadraticCurveTo(0, 18 + hemWave * 0.3, -18 - hemFlare, 15 + hemWave)
      .closePath()
      .fill({ color: 0x222c42 });

    // Dynamic starlight rim highlight on front of child's silhouette
    this.rimLightGraphics.clear();
    if (starWarmLight > 0.08) {
      const rimSide = dxToStar >= 0 ? 1 : -1;
      this.rimLightGraphics
        .moveTo(rimSide * 10, -35)
        .lineTo(rimSide * 14, 4)
        .stroke({ width: 2.5, color: 0x9beaff, alpha: starWarmLight * 0.68 });
      this.rimLightGraphics
        .arc(2 + yawShift * 0.45, -56, 15.2, rimSide > 0 ? -0.9 : 2.2, rimSide > 0 ? 0.9 : 4.0)
        .stroke({ width: 2.2, color: 0xbef4ff, alpha: starWarmLight * 0.72 });
    }
  }

  private drawExpression(child: ChildState, yawShift: number, starLight: number, t: number): void {
    this.faceGraphics.clear();

    // Deterministic gentle blink (~every 3.6s)
    const blinkCycle = (t * 0.28 + 0.37) % 1;
    const blinkOpen = blinkCycle > 0.95 ? Math.abs(Math.sin((blinkCycle - 0.95) * 20 * Math.PI)) : 1;

    // Gaze offset bounded safely inside eye socket
    const gx = clamp((child.gazeX - child.x) * child.facing * 0.008, -1.8, 2.2);
    const gy = clamp((child.gazeY - (child.y - 98)) * 0.008, -1.8, 1.8);

    const eyeX1 = 5 + yawShift * 0.6;
    const eyeX2 = 12.5 + yawShift * 0.45;
    const eyeY = -15.5;
    const mood = child.expressionMood; // 0 neutral, 1 curious, 2 concerned, 3 disappointed, 4 awe, 5 smile

    // Eye height opens wider for awe (4), narrows softly on smile (5) or concern
    const eyeRadiusY =
      (mood >= 3.5 && mood < 4.5 ? 3.1 : mood >= 4.5 ? 2.1 : 2.5) * Math.max(0.15, blinkOpen);

    // Draw both eyes (sclera + iris + starlight catchlight!)
    for (const ex of [eyeX1, eyeX2]) {
      this.faceGraphics.ellipse(ex, eyeY, 2.5, eyeRadiusY).fill({ color: 0xf4eee8 });
      if (blinkOpen > 0.35) {
        this.faceGraphics
          .circle(ex + gx * 0.55, eyeY + gy * 0.55, 1.65)
          .fill({ color: 0x1b2840 });
        // Luminous star catchlight in eyes!
        if (starLight > 0.12) {
          this.faceGraphics
            .circle(ex + gx * 0.55 + 0.6, eyeY + gy * 0.55 - 0.6, 0.7)
            .fill({ color: 0xdff8ff, alpha: clamp(starLight + 0.3, 0, 1) });
        }
      }
    }

    // Expressive eyebrows
    const browTilt =
      mood >= 1.5 && mood < 2.6 ? -0.35 : // concerned inner raise
      mood >= 2.6 && mood < 3.5 ? 0.2 :   // sad/disappointed droop
      0;
    const browRaise = mood >= 3.5 && mood < 4.5 ? -2.2 : 0;
    this.faceGraphics
      .moveTo(eyeX1 - 2.5, eyeY - 4.2 + browRaise - browTilt * 2)
      .lineTo(eyeX1 + 2.5, eyeY - 4.2 + browRaise + browTilt * 2)
      .stroke({ width: 1.5, color: 0x1b2030 });
    this.faceGraphics
      .moveTo(eyeX2 - 2.2, eyeY - 4.2 + browRaise + browTilt * 2)
      .lineTo(eyeX2 + 2.2, eyeY - 4.2 + browRaise - browTilt * 2)
      .stroke({ width: 1.5, color: 0x1b2030 });

    // Expressive mouth (neutral -> worried -> amazed O -> warm smile!)
    const mx = 8.5 + yawShift * 0.55;
    const my = -7.2;
    if (mood >= 4.5) {
      // Gentle smile (Scene 6)
      this.faceGraphics
        .moveTo(mx - 3.2, my - 0.5)
        .quadraticCurveTo(mx, my + 2.6, mx + 3.6, my - 0.8)
        .stroke({ width: 1.5, color: 0x704340 });
    } else if (mood >= 3.5) {
      // Wonder / quiet "oh" (Scene 5)
      this.faceGraphics.ellipse(mx, my, 2.0, 2.4).fill({ color: 0x7a4846 });
    } else if (mood >= 2.6) {
      // Disappointed downturn (Scene 4 drop)
      this.faceGraphics
        .moveTo(mx - 2.8, my + 1.0)
        .quadraticCurveTo(mx, my - 1.8, mx + 2.8, my + 1.0)
        .stroke({ width: 1.4, color: 0x6e4342 });
    } else {
      // Soft contemplative line / slight concern
      this.faceGraphics
        .moveTo(mx - 2.5, my)
        .quadraticCurveTo(mx, my + (mood > 1.5 ? -1.0 : 0.3), mx + 2.5, my)
        .stroke({ width: 1.3, color: 0x6b4342 });
    }
  }
}
