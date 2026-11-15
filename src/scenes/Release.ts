import gsap from 'gsap';
import { FilmState } from '../types';

/**
 * Scene 4 — THE RELEASE (16.0s – 23.0s)
 * Primary animation showcase:
 * open door -> weak failed hop & squash -> disappointment -> lift skyward -> explosive burst & vertical follow!
 */
export function buildReleaseTimeline(state: FilmState): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Pull back slightly to frame headroom above lantern
  tl.to(state.cam, {
    x: 92,
    y: 92,
    zoom: 1.82,
    duration: 1.1,
    ease: 'power2.out',
  }, 0);

  // 16.2s: Child opens lantern door
  tl.to(state.lantern, {
    doorOpen: 1,
    swingAngle: -0.08,
    duration: 0.65,
    ease: 'back.out(1.6)',
  }, 0.2);

  // 17.15s: Star detaches & attempts weak hop upward
  tl.set(state.star, { freeBlend: 1, x: 105, y: 122 }, 1.15);
  tl.to(state.star, {
    y: 72,
    scaleX: 0.84,
    scaleY: 1.24, // upward stretch
    coreIntensity: 0.68,
    duration: 0.65,
    ease: 'power2.out',
  }, 1.15);

  // Stalls & falls back down into lantern with subtle squash on landing (17.85s -> 18.45s)
  tl.to(state.star, {
    y: 122,
    scaleX: 1.26,
    scaleY: 0.76, // squash on impact
    coreIntensity: 0.28,
    duration: 0.52,
    ease: 'power2.in',
  }, 1.82);
  tl.to(state.star, {
    scaleX: 1,
    scaleY: 1,
    duration: 0.28,
    ease: 'elastic.out(1, 0.5)',
  }, 2.34);
  tl.set(state.star, { freeBlend: 0 }, 2.45);

  // Child slumps subtly in disappointment (18.4s -> 19.1s)
  tl.to(state.child, {
    expressionMood: 3, // disappointed
    headPitch: 0.28,
    bodyLean: 0.1,
    liftHeight: 0.34,
    duration: 0.65,
    ease: 'power2.out',
  }, 2.35);

  // 19.25s: Anticipation breath & determined lift high toward the sky!
  tl.to(state.child, {
    crouch: 0.0,
    bodyLean: -0.08,
    liftHeight: 1.0,
    headPitch: -0.48,
    gazeX: 105,
    gazeY: -220,
    expressionMood: 4, // hopeful awe
    clothWind: 0.35,
    duration: 1.35,
    ease: 'power2.inOut',
  }, 3.25);

  tl.to(state.cam, {
    x: 84,
    y: -25,
    zoom: 1.48,
    duration: 1.35,
    ease: 'power2.inOut',
  }, 3.25);

  // 20.6s -> 21.0s: Intense anticipation charge & compression before explosion!
  tl.to(state.star, {
    coreIntensity: 1.9,
    pulseRate: 4.5,
    pulseAmp: 0.28,
    scaleX: 1.24,
    scaleY: 0.8,
    duration: 0.38,
    ease: 'power2.in',
  }, 4.6);

  // 21.00s: EXPLOSIVE LAUNCH!
  tl.set(state.star, { freeBlend: 1, x: 105, y: 12 }, 5.0);

  // Radial shockwave + screen bloom + camera trauma shake + wind gust on child's cloak/scarf
  tl.to(state.star, {
    burstProgress: 1,
    duration: 1.15,
    ease: 'power2.out',
  }, 5.0);
  tl.to(state.transition, {
    bloomFlash: 0.75,
    duration: 0.14,
    ease: 'power2.out',
  }, 5.0);
  tl.to(state.transition, {
    bloomFlash: 0,
    duration: 0.85,
    ease: 'power2.out',
  }, 5.14);

  tl.to(state.cam, {
    shakeAmp: 16,
    duration: 0.08,
  }, 5.0);
  tl.to(state.cam, {
    shakeAmp: 0,
    duration: 0.95,
    ease: 'power3.out',
  }, 5.08);

  tl.to(state.child, {
    clothWind: 0.95,
    bodyLean: -0.14,
    duration: 0.35,
    ease: 'power2.out',
  }, 5.0);
  tl.to(state.child, {
    clothWind: 0.3,
    duration: 1.4,
    ease: 'sine.out',
  }, 5.35);

  // Speed-stretched comet ascent & trail ignition
  tl.to(state.star, {
    scaleX: 0.56,
    scaleY: 2.85,
    trailIntensity: 1.0,
    coreIntensity: 2.15,
    duration: 0.55,
    ease: 'expo.out',
  }, 5.0);

  // Camera rockets vertically upward following the star into the clouds (21.0s -> 23.0s)
  tl.to(state.cam, {
    x: 92,
    y: -1460,
    zoom: 1.18,
    focusBlurBg: 2.0,
    focusBlurFg: 0,
    duration: 2.0,
    ease: 'power3.inOut',
  }, 5.0);

  tl.to(state.world, {
    ambientDarkness: 0.25,
    vignetteStrength: 0.52,
    duration: 1.8,
    ease: 'sine.out',
  }, 5.1);

  return tl;
}
