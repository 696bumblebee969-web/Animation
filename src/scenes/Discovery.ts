import gsap from 'gsap';
import { FilmState } from '../types';

/**
 * Scene 2 — THE DISCOVERY (5.0s – 10.0s)
 * Wide -> tracking -> close-up. Child stops, turns head toward faint blue lantern glow, approaches carefully.
 */
export function buildDiscoveryTimeline(state: FilmState): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Faint cyan star glow ignites weakly inside the abandoned lantern at 5.2s
  tl.to(state.star, {
    coreIntensity: 0.36,
    pulseAmp: 0.14,
    duration: 1.1,
    ease: 'sine.out',
  }, 0.15);
  tl.to(state.lantern, {
    glassGlow: 0.42,
    duration: 1.1,
    ease: 'sine.out',
  }, 0.15);

  // Child slows to a halt (5.0s -> 5.75s)
  tl.to(state.child, {
    x: -36,
    walkPhase: 4.2,
    walkBlend: 0,
    bodyLean: 0.02,
    duration: 0.75,
    ease: 'power2.out',
  }, 0);

  // Anticipation: Head turns toward the light + gaze locks onto lantern (5.75s -> 6.55s)
  tl.to(state.child, {
    headYaw: 0.42,
    headPitch: 0.14,
    gazeX: 165,
    gazeY: 196,
    expressionMood: 1, // curious
    duration: 0.75,
    ease: 'power2.inOut',
  }, 0.7);

  // Tracking camera shifts around child & pushes in toward lantern
  tl.to(state.cam, {
    x: 85,
    y: 122,
    zoom: 1.68,
    focusBlurBg: 5.5,
    focusBlurFg: 9.0,
    duration: 4.2,
    ease: 'power2.inOut',
  }, 0.8);

  // Child resumes cautious walk closer to lantern (6.5s -> 8.6s)
  tl.to(state.child, {
    walkBlend: 0.65,
    duration: 0.25,
    ease: 'power1.in',
  }, 1.5);
  tl.to(state.child, {
    x: 56,
    walkPhase: 5.65,
    duration: 1.9,
    ease: 'sine.inOut',
  }, 1.55);
  tl.to(state.child, {
    walkBlend: 0,
    duration: 0.3,
    ease: 'power2.out',
  }, 3.3);

  // Crouches down gently to peer at the trapped star (8.5s -> 9.9s)
  tl.to(state.child, {
    crouch: 0.56,
    headPitch: 0.26,
    headYaw: 0.22,
    bodyLean: 0.08,
    duration: 1.35,
    ease: 'power2.inOut',
  }, 3.55);

  return tl;
}
