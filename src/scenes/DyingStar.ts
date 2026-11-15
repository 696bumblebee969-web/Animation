import gsap from 'gsap';
import { FilmState } from '../types';

/**
 * Scene 3 — THE DYING STAR (10.0s – 16.0s)
 * Intimate close-up. Environment deepens into chiaroscuro; child anticipates, reaches, grips, and lifts lantern.
 */
export function buildDyingStarTimeline(state: FilmState): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Close-up push-in while world darkens around them
  tl.to(state.cam, {
    x: 112,
    y: 110,
    zoom: 2.22,
    focusBlurBg: 8.5,
    focusBlurFg: 12.0,
    duration: 3.2,
    ease: 'power2.inOut',
  }, 0);

  tl.to(state.world, {
    ambientDarkness: 0.78,
    vignetteStrength: 0.88,
    duration: 3.0,
    ease: 'sine.inOut',
  }, 0);

  // Star visibly weakens and nearly goes out around 10.8s -> 11.8s
  tl.to(state.star, {
    coreIntensity: 0.16,
    pulseRate: 0.55,
    pulseAmp: 0.08,
    duration: 1.3,
    ease: 'sine.inOut',
  }, 0.2);

  // Anticipation beat: slight intake / pullback before reaching
  tl.to(state.child, {
    bodyLean: -0.02,
    reachProgress: -0.06,
    expressionMood: 2, // concerned eyebrows
    duration: 0.45,
    ease: 'power1.out',
  }, 1.2);

  // Smooth reach toward lantern bail handle (11.65s -> 12.85s)
  tl.to(state.child, {
    reachProgress: 1.0,
    bodyLean: 0.12,
    duration: 1.2,
    ease: 'power2.inOut',
  }, 1.65);

  // Grips handle & lifts lantern tenderly toward chest (12.9s -> 15.2s)
  tl.set(state.lantern, { attachedToHand: 1 }, 2.9);
  tl.to(state.lantern, {
    swingAngle: 0.14,
    duration: 0.45,
    ease: 'sine.out',
  }, 2.9);
  tl.to(state.lantern, {
    swingAngle: -0.06,
    duration: 0.75,
    ease: 'sine.inOut',
  }, 3.35);
  tl.to(state.lantern, {
    swingAngle: 0.02,
    duration: 1.1,
    ease: 'sine.out',
  }, 4.1);

  tl.to(state.child, {
    crouch: 0.18,
    bodyLean: 0.04,
    liftHeight: 0.42,
    headPitch: 0.16,
    gazeX: 112,
    gazeY: 132,
    duration: 2.1,
    ease: 'power2.inOut',
  }, 2.95);

  // Star warms slightly in response to child's care!
  tl.to(state.star, {
    coreIntensity: 0.56,
    pulseRate: 0.95,
    pulseAmp: 0.14,
    duration: 2.2,
    ease: 'sine.out',
  }, 3.1);
  tl.to(state.lantern, {
    glassGlow: 0.72,
    duration: 2.0,
    ease: 'sine.out',
  }, 3.1);

  return tl;
}
