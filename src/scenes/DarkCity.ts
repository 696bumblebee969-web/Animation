import gsap from 'gsap';
import { FilmState } from '../types';

/**
 * Scene 1 — THE DARK CITY (0.0s – 5.0s)
 * Slow 2.5D camera push-in through fog and flickering lamps as the small child walks alone.
 */
export function buildDarkCityTimeline(state: FilmState): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Establishing shot -> slow push-in
  tl.to(state.cam, {
    x: -90,
    y: 20,
    zoom: 1.14,
    focusBlurBg: 1.2,
    focusBlurFg: 4.5,
    duration: 5.0,
    ease: 'sine.inOut',
  }, 0);

  // Child walks steadily right along the dark street
  tl.to(state.child, {
    x: -58,
    walkPhase: 3.85,
    duration: 4.9,
    ease: 'none',
  }, 0);

  // Subtle gait deceleration just before noticing the glow at 5.0s
  tl.to(state.child, {
    walkBlend: 0.92,
    duration: 4.5,
    ease: 'none',
  }, 0);

  return tl;
}
