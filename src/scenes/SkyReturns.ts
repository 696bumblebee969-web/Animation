import gsap from 'gsap';
import { FilmState } from '../types';

/**
 * Scene 5 — THE SKY RETURNS (23.0s – 28.0s)
 * Star breaks through clouds -> clouds part -> hundreds of stars ignite -> city warms -> dramatic vertical pull-back.
 */
export function buildSkyReturnsTimeline(state: FilmState): gsap.core.Timeline {
  const tl = gsap.timeline();

  // 23.0s -> 24.2s: Star pierces the storm deck while camera reaches zenith (-1740)
  tl.to(state.cam, {
    x: 65,
    y: -1740,
    zoom: 1.1,
    duration: 1.15,
    ease: 'power2.out',
  }, 0);

  // Clouds curl & separate wide!
  tl.to(state.world, {
    cloudSplit: 1.0,
    duration: 2.1,
    ease: 'power3.inOut',
  }, 0.15);

  // 24.2s: Celestial breakthrough nova wave + color palette transformation + starfield ignition!
  tl.to(state.star, {
    skyBurstProgress: 1.0,
    scaleX: 1.0,
    scaleY: 1.0,
    trailIntensity: 0.15,
    coreIntensity: 1.5,
    duration: 1.4,
    ease: 'power2.out',
  }, 1.1);

  tl.to(state.transition, {
    bloomFlash: 0.65,
    duration: 0.2,
    ease: 'sine.out',
  }, 1.15);
  tl.to(state.transition, {
    bloomFlash: 0,
    duration: 1.1,
    ease: 'sine.out',
  }, 1.35);

  tl.to(state.world, {
    skyStarsAlpha: 1.0,
    skyWarmth: 1.0,
    ambientDarkness: 0.0,
    vignetteStrength: 0.34,
    duration: 2.4,
    ease: 'sine.inOut',
  }, 1.1);

  // City windows illuminate across the skyline as the sky opens
  tl.to(state.world, {
    cityLightsOn: 1.0,
    duration: 2.2,
    ease: 'power1.inOut',
  }, 1.6);

  // 24.3s -> 27.9s: Dramatic vertical pull-back revealing the city beneath the starry sky!
  tl.to(state.cam, {
    x: 20,
    y: -275,
    zoom: 0.84,
    focusBlurBg: 0,
    focusBlurFg: 2.5,
    duration: 3.6,
    ease: 'power2.inOut',
  }, 1.3);

  // Child lowers lantern slightly & gazes straight up in wonder
  tl.to(state.child, {
    liftHeight: 0.25,
    headPitch: -0.35,
    bodyLean: -0.02,
    clothWind: 0.25,
    expressionMood: 4,
    duration: 2.0,
    ease: 'sine.inOut',
  }, 1.5);

  return tl;
}
