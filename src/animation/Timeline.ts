import gsap from 'gsap';
import { FilmState } from '../types';
import { buildDarkCityTimeline } from '../scenes/DarkCity';
import { buildDiscoveryTimeline } from '../scenes/Discovery';
import { buildDyingStarTimeline } from '../scenes/DyingStar';
import { buildReleaseTimeline } from '../scenes/Release';
import { buildSkyReturnsTimeline } from '../scenes/SkyReturns';
import { buildFinalShotTimeline } from '../scenes/FinalShot';

export function createInitialFilmState(): FilmState {
  return {
    cam: {
      x: -230,
      y: -15,
      zoom: 0.96,
      roll: 0,
      focusBlurBg: 0.5,
      focusBlurFg: 2.5,
      shakeAmp: 0,
    },
    world: {
      skyWarmth: 0,
      cityLightsOn: 0,
      cloudSplit: 0,
      ambientDarkness: 0.18,
      fogDensity: 0.9,
      vignetteStrength: 0.62,
      skyStarsAlpha: 0,
      fadeToBlack: 0,
    },
    child: {
      x: -360,
      y: 222,
      scale: 1.0,
      facing: 1,
      walkPhase: 0,
      walkBlend: 1,
      crouch: 0,
      bodyLean: 0.05,
      headPitch: 0.04,
      headYaw: 0,
      gazeX: 20,
      gazeY: 165,
      reachProgress: 0,
      liftHeight: 0,
      expressionMood: 0,
      clothWind: 0.14,
    },
    lantern: {
      groundX: 105,
      groundY: 222,
      attachedToHand: 0,
      swingAngle: 0,
      doorOpen: 0,
      glassGlow: 0.05,
      scale: 1.0,
    },
    star: {
      freeBlend: 0,
      x: 105,
      y: 206,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      coreIntensity: 0.04,
      pulseRate: 0.75,
      pulseAmp: 0.08,
      trailIntensity: 0,
      burstProgress: 0,
      skyBurstProgress: 0,
      cometProgress: 0,
    },
    transition: {
      bloomFlash: 0,
      cutShotIndex: 0,
    },
  };
}

/**
 * Single authoritative GSAP master timeline controlling all 6 scenes from t=0 to t=30s.
 * Paused so Remotion / renderer can deterministically scrub `.seek(frame / 60)`.
 */
export function buildMasterTimeline(): {
  timeline: gsap.core.Timeline;
  state: FilmState;
} {
  const state = createInitialFilmState();
  const master = gsap.timeline({ paused: true });

  master.add(buildDarkCityTimeline(state), 0);
  master.add(buildDiscoveryTimeline(state), 5.0);
  master.add(buildDyingStarTimeline(state), 10.0);
  master.add(buildReleaseTimeline(state), 16.0);
  master.add(buildSkyReturnsTimeline(state), 23.0);
  master.add(buildFinalShotTimeline(state), 28.0);

  master.seek(0);
  return { timeline: master, state };
}
