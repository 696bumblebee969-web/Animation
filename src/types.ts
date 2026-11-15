export const FILM_WIDTH = 1920;
export const FILM_HEIGHT = 1080;
export const FILM_FPS = 60;
export const FILM_DURATION_SEC = 30;
export const FILM_TOTAL_FRAMES = FILM_FPS * FILM_DURATION_SEC; // 1800

export type ExpressionMood = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = neutral/solemn, 1 = curious, 2 = concerned, 3 = disappointed, 4 = awe/wonder, 5 = gentle smile

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  roll: number;
  focusBlurBg: number;
  focusBlurFg: number;
  shakeAmp: number;
}

export interface WorldState {
  skyWarmth: number;        // 0 = bleak dark slate, 1 = radiant celestial azure & gold
  cityLightsOn: number;     // 0..1 staggered city window illumination
  cloudSplit: number;       // 0 = closed storm ceiling, 1 = parted canopy
  ambientDarkness: number;  // 0..1 chiaroscuro darkness overlay (peaks in Scene 3)
  fogDensity: number;       // 0..1 ground mist intensity
  vignetteStrength: number; // 0..1 optical edge vignette
  skyStarsAlpha: number;    // 0..1 background starfield visibility
  fadeToBlack: number;      // 0..1 final fade out
}

export interface ChildState {
  x: number;
  y: number;
  scale: number;
  facing: number;           // +1 right, -1 left
  walkPhase: number;        // continuous gait cycles
  walkBlend: number;        // 0 = idle/standing, 1 = full stride
  crouch: number;           // 0 = upright, 1 = deep crouch
  bodyLean: number;         // radians forward/back
  headPitch: number;        // radians (+ down, - up)
  headYaw: number;          // -1..+1 turn toward/away
  gazeX: number;            // world-relative look target X
  gazeY: number;            // world-relative look target Y
  reachProgress: number;    // 0..1 arm reaching for lantern
  liftHeight: number;       // 0 = on ground, 0.45 = chest cradle, 1.0 = held overhead
  expressionMood: number;   // continuous blend across moods 0..5
  clothWind: number;        // ambient breeze strength on scarf/cloak/hair
}

export interface LanternState {
  groundX: number;
  groundY: number;
  attachedToHand: number;   // 0 = sitting on cobblestones, 1 = carried by hand
  swingAngle: number;       // pendulum inertia radians
  doorOpen: number;         // 0 = closed latch, 1 = open glass door
  glassGlow: number;        // internal reflection warmth
  scale: number;
}

export interface StarState {
  freeBlend: number;        // 0 = inside lantern, 1 = free world coords
  x: number;                // free-flight world X
  y: number;                // free-flight world Y
  scaleX: number;
  scaleY: number;
  rotation: number;
  coreIntensity: number;    // 0..2.2 brightness
  pulseRate: number;        // breathing Hz
  pulseAmp: number;         // breathing amplitude
  trailIntensity: number;   // 0..1 comet streak & sparks
  burstProgress: number;    // 0..1 shockwave blast at 21.0s
  skyBurstProgress: number; // 0..1 breakthrough nova at 24.2s
  cometProgress: number;    // 0..1 Final Shot gliding star
}

export interface TransitionState {
  bloomFlash: number;       // 0..1 additive screen-space light flash
  cutShotIndex: number;     // 0 = street/sky shot, 1 = rooftop final shot
}

export interface FilmState {
  cam: CameraState;
  world: WorldState;
  child: ChildState;
  lantern: LanternState;
  star: StarState;
  transition: TransitionState;
}
