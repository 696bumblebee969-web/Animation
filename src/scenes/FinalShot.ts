import gsap from 'gsap';
import { FilmState } from '../types';

/**
 * Scene 6 — FINAL SHOT (28.0s – 30.0s)
 * Hard cut to rooftop panorama overlooking glowing city & starlit sky.
 * Bright comet glides smoothly; child smiles; hold 1s; fade to black.
 */
export function buildFinalShotTimeline(state: FilmState): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Instant story-motivated cut to rooftop composition at t = 28.0s
  tl.set(state.transition, { cutShotIndex: 1, bloomFlash: 0.28 }, 0);
  tl.to(state.transition, { bloomFlash: 0, duration: 0.45, ease: 'sine.out' }, 0);

  // Re-frame camera cleanly for wide rooftop shot
  tl.set(state.cam, { x: 0, y: -145, zoom: 1.0, focusBlurBg: 0, focusBlurFg: 0 }, 0);
  tl.to(state.cam, {
    y: -158,
    zoom: 1.03,
    duration: 1.8,
    ease: 'sine.out',
  }, 0);

  // Reposition child standing on rooftop crest looking out over the sky
  tl.set(state.child, {
    x: -255,
    y: 145,
    scale: 1.08,
    facing: 1,
    walkBlend: 0,
    crouch: 0,
    bodyLean: -0.02,
    headPitch: -0.24,
    headYaw: 0.12,
    gazeX: 120,
    gazeY: -475,
    reachProgress: 0.4,
    liftHeight: 0.15,
    expressionMood: 5, // peaceful warm smile
    clothWind: 0.28,
  }, 0);

  // Bright shooting star glides across the cosmos
  tl.set(state.star, {
    freeBlend: 1,
    coreIntensity: 1.65,
    scaleX: 1.15,
    scaleY: 1.15,
    trailIntensity: 0,
    burstProgress: 0,
    skyBurstProgress: 0,
    cometProgress: 0.05,
  }, 0);
  tl.to(state.star, {
    cometProgress: 0.92,
    duration: 1.65,
    ease: 'sine.inOut',
  }, 0);

  // Hold peaceful composition (~1s), then subtle fade to black (29.2s -> 30.0s)
  tl.to(state.world, {
    fadeToBlack: 1.0,
    duration: 0.8,
    ease: 'sine.inOut',
  }, 1.2);

  return tl;
}
