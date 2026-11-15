import { Application, BlurFilter, Container } from 'pixi.js';
import gsap from 'gsap';
import { FILM_HEIGHT, FILM_WIDTH, FilmState } from './types';
import { createProceduralTextures } from './effects/Textures';
import { CityWorld, getRooftopCometPos } from './world/CityBuilder';
import { FogAndCloudsSystem } from './effects/Fog';
import { ParticleSystem, evaluateStarAscentWorldPos } from './effects/Particles';
import { StarVisualRig } from './effects/Glow';
import { LightingSystem } from './effects/Lighting';
import { CharacterAnimator } from './animation/CharacterAnimator';
import { ParallaxSystem } from './animation/ParallaxSystem';
import { CameraAnimator } from './animation/CameraAnimator';
import { buildMasterTimeline } from './animation/Timeline';
import { lerp } from './utils/math';

export class LastStarEngine {
  public readonly app: Application;
  private readonly masterTimeline: gsap.core.Timeline;
  private readonly state: FilmState;

  private readonly parallax = new ParallaxSystem();
  private readonly camera = new CameraAnimator();
  private readonly city = new CityWorld();
  private readonly character = new CharacterAnimator();

  private readonly fogSystem: FogAndCloudsSystem;
  private readonly particles: ParticleSystem;
  private readonly starRig: StarVisualRig;
  private readonly lighting: LightingSystem;

  // Depth Layer Containers (0..5)
  private readonly layer0Sky = new Container();
  private readonly layer1Distant = new Container();
  private readonly layer2Midground = new Container();
  private readonly layer3Action = new Container();
  private readonly layer4Foreground = new Container();
  private readonly layer5Atmosphere = new Container();
  private readonly screenOverlayLayer = new Container();

  private constructor(app: Application) {
    this.app = app;
    const { timeline, state } = buildMasterTimeline();
    this.masterTimeline = timeline;
    this.state = state;

    const textures = createProceduralTextures();
    this.fogSystem = new FogAndCloudsSystem(textures);
    this.particles = new ParticleSystem(textures);
    this.starRig = new StarVisualRig(textures);
    this.lighting = new LightingSystem(textures, this.city.lampPositions);

    // Layer 0: Sky + Celestial Starfield
    this.layer0Sky.addChild(this.city.skyLayer, this.particles.skyStarsLayer);

    // Layer 1: Distant Skyline + Storm Cloud Deck
    this.layer1Distant.addChild(
      this.city.distantLayer,
      this.fogSystem.cloudDeckLayer
    );

    // Layer 2: Midground Buildings + Street Lamps + Ground Mist
    this.layer2Midground.addChild(
      this.city.midgroundLayer,
      this.fogSystem.streetFogLayer
    );

    // Layer 3: Primary Action (Street, Rooftop, Dynamic Ground Glow, Child, Star, Trail Sparks)
    this.layer3Action.addChild(
      this.city.streetLayer,
      this.city.rooftopLayer,
      this.lighting.groundLightLayer,
      this.character.root,
      this.particles.actionSparksLayer,
      this.starRig.container
    );

    // Layer 4: Foreground Framing Silhouettes
    this.layer4Foreground.addChild(this.city.foregroundLayer);

    // Layer 5: Atmospheric Foreground Mist & Floating Motes
    this.layer5Atmosphere.addChild(
      this.fogSystem.foregroundFogLayer,
      this.particles.foregroundDustLayer
    );

    // Register 6 depth planes with true differential 2.5D parallax & optical DOF blur
    this.parallax.registerLayer({
      name: 'sky',
      container: this.layer0Sky,
      parallaxX: 0.08,
      parallaxY: 0.14,
      zoomWeight: 0.25,
    });
    this.parallax.registerLayer({
      name: 'distant',
      container: this.layer1Distant,
      parallaxX: 0.34,
      parallaxY: 0.48,
      zoomWeight: 0.58,
      blurFilter: new BlurFilter({ strength: 0, quality: 3 }),
    });
    this.parallax.registerLayer({
      name: 'midground',
      container: this.layer2Midground,
      parallaxX: 0.68,
      parallaxY: 0.84,
      zoomWeight: 0.85,
      blurFilter: new BlurFilter({ strength: 0, quality: 3 }),
    });
    this.parallax.registerLayer({
      name: 'action',
      container: this.layer3Action,
      parallaxX: 1.0,
      parallaxY: 1.0,
      zoomWeight: 1.0,
    });
    this.parallax.registerLayer({
      name: 'foreground',
      container: this.layer4Foreground,
      parallaxX: 1.48,
      parallaxY: 1.18,
      zoomWeight: 1.32,
      blurFilter: new BlurFilter({ strength: 0, quality: 3 }),
    });
    this.parallax.registerLayer({
      name: 'atmosphere',
      container: this.layer5Atmosphere,
      parallaxX: 1.65,
      parallaxY: 1.25,
      zoomWeight: 1.15,
    });

    // Screen-space finishing stack (chiaroscuro, additive bloom, optical vignette, subtle grain)
    this.screenOverlayLayer.addChild(
      this.lighting.darknessOverlay,
      this.lighting.screenBloom,
      this.lighting.vignetteSprite,
      this.lighting.grainSprite
    );

    this.app.stage.addChild(this.parallax.root, this.screenOverlayLayer);
  }

  public static async create(canvas: HTMLCanvasElement): Promise<LastStarEngine> {
    const app = new Application();
    await app.init({
      canvas,
      width: FILM_WIDTH,
      height: FILM_HEIGHT,
      backgroundColor: 0x040711,
      antialias: true,
      autoStart: false,
      resolution: 1,
      preserveDrawingBuffer: true,
    });

    const engine = new LastStarEngine(app);
    engine.renderAtTime(0);
    return engine;
  }

  /**
   * Deterministically evaluates the entire film at time t (seconds) and renders one WebGL frame.
   */
  public renderAtTime(t: number): void {
    // 1. Seek authoritative GSAP master timeline
    this.masterTimeline.seek(t, false);
    const s = this.state;

    // 2. First compute character pose so grip point transforms are exact
    // Pre-estimate star position for rim-light calculation
    const preStarPos = this.computeStarWorldPosition(t, s);
    this.character.update({
      child: s.child,
      starWorldX: preStarPos.x,
      starWorldY: preStarPos.y,
      starIntensity: s.star.coreIntensity,
      t,
    });

    // 3. Synchronize lantern world position (ground vs. child's gripping hand!)
    this.character.root.updateLocalTransform();
    const handLocalToAction = this.layer3Action.toLocal(
      { x: 0, y: 0 },
      this.character.lanternGripPoint
    );
    const handBailX = handLocalToAction.x;
    const handBailY = handLocalToAction.y + 42; // offset from bail handle to lantern base

    const lx = lerp(s.lantern.groundX, handBailX, s.lantern.attachedToHand);
    const ly = lerp(s.lantern.groundY, handBailY, s.lantern.attachedToHand);
    this.city.streetLanternAnchor.position.set(lx, ly);
    this.city.streetLanternAnchor.rotation = s.lantern.swingAngle;
    this.city.streetLanternAnchor.visible = s.transition.cutShotIndex < 0.5;

    // 4. Exact final star world position (inside lantern center, ascending sky path, or rooftop comet)
    let starX = lx - Math.sin(s.lantern.swingAngle) * 16;
    let starY = ly - 16 * Math.cos(s.lantern.swingAngle);

    if (s.transition.cutShotIndex > 0.5) {
      const comet = getRooftopCometPos(s.star.cometProgress);
      starX = comet.x;
      starY = comet.y;
    } else if (t >= 21.0) {
      const ascent = evaluateStarAscentWorldPos(t);
      starX = ascent.x;
      starY = ascent.y;
    } else if (s.star.freeBlend > 0.5) {
      starX = s.star.x;
      starY = s.star.y;
    }

    // 5. Update Lighting, Particles, Clouds/Fog, City, Star Rig, and 2.5D Camera
    const { lampFlickers } = this.lighting.update({
      starWorldX: starX,
      starWorldY: starY,
      starIntensity: s.star.coreIntensity,
      ambientDarkness: s.world.ambientDarkness,
      skyWarmth: s.world.skyWarmth,
      bloomFlash: s.transition.bloomFlash,
      vignetteStrength: s.world.vignetteStrength,
      fadeToBlack: s.world.fadeToBlack,
      t,
      cutShotIndex: s.transition.cutShotIndex,
    });

    this.city.update({
      skyWarmth: s.world.skyWarmth,
      cityLightsOn: s.world.cityLightsOn,
      lanternDoorOpen: s.lantern.doorOpen,
      lanternGlow: s.lantern.glassGlow,
      starWorldX: starX,
      starWorldY: starY,
      starIntensity: s.star.coreIntensity,
      lampFlickers,
      cutShotIndex: s.transition.cutShotIndex,
      cometProgress: s.star.cometProgress,
    });

    this.fogSystem.update({
      t,
      cloudSplit: s.world.cloudSplit,
      fogDensity: s.world.fogDensity,
      skyWarmth: s.world.skyWarmth,
      starWorldX: starX,
      starWorldY: starY,
      starIntensity: s.star.coreIntensity,
      cutShotIndex: s.transition.cutShotIndex,
    });

    this.particles.update({
      t,
      skyStarsAlpha: s.world.skyStarsAlpha,
      skyWarmth: s.world.skyWarmth,
      starWorldX: starX,
      starWorldY: starY,
      starIntensity: s.star.coreIntensity,
      trailIntensity: s.star.trailIntensity,
      camY: s.cam.y,
    });

    this.starRig.update({
      x: starX,
      y: starY,
      scaleX: s.star.scaleX,
      scaleY: s.star.scaleY,
      rotation: s.star.rotation,
      intensity: s.star.coreIntensity,
      pulseRate: s.star.pulseRate,
      pulseAmp: s.star.pulseAmp,
      burstProgress: s.star.burstProgress,
      skyBurstProgress: s.star.skyBurstProgress,
      t,
    });

    this.camera.apply(this.parallax, s.cam, t);
    this.app.renderer.render(this.app.stage);
  }

  private computeStarWorldPosition(t: number, s: FilmState): { x: number; y: number } {
    if (s.transition.cutShotIndex > 0.5) {
      return getRooftopCometPos(s.star.cometProgress);
    }
    if (t >= 21.0) {
      return evaluateStarAscentWorldPos(t);
    }
    if (s.star.freeBlend > 0.5) {
      return { x: s.star.x, y: s.star.y };
    }
    if (s.lantern.attachedToHand > 0.5) {
      return {
        x: s.child.x + 28 * s.child.facing,
        y: s.child.y - 68 - s.child.liftHeight * 62,
      };
    }
    return { x: s.lantern.groundX, y: s.lantern.groundY - 16 };
  }

  public destroy(): void {
    this.masterTimeline.kill();
    this.app.destroy(false, { children: true, texture: true });
  }
}
