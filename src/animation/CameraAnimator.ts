import { CameraState } from '../types';
import { evalTraumaShake } from '../utils/math';
import { ParallaxSystem } from './ParallaxSystem';

export class CameraAnimator {
  public apply(
    parallax: ParallaxSystem,
    cam: CameraState,
    t: number
  ): { effectiveX: number; effectiveY: number } {
    const shake = evalTraumaShake(t, cam.shakeAmp);
    const effectiveX = cam.x + shake.sx;
    const effectiveY = cam.y + shake.sy;

    parallax.applyCamera({
      camX: effectiveX,
      camY: effectiveY,
      zoom: cam.zoom,
      roll: cam.roll + shake.rot,
      focusBlurBg: cam.focusBlurBg,
      focusBlurFg: cam.focusBlurFg,
    });

    return { effectiveX, effectiveY };
  }
}
