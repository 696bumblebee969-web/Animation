import { BlurFilter, Container } from 'pixi.js';
import { FILM_HEIGHT, FILM_WIDTH } from '../types';

export interface DepthLayerConfig {
  name: string;
  container: Container;
  parallaxX: number;
  parallaxY: number;
  zoomWeight: number;
  blurFilter?: BlurFilter;
}

export class ParallaxSystem {
  public readonly root = new Container();
  private readonly layers: DepthLayerConfig[] = [];

  public registerLayer(config: DepthLayerConfig): void {
    if (config.blurFilter) {
      config.container.filters = [config.blurFilter];
    }
    this.layers.push(config);
    this.root.addChild(config.container);
  }

  public applyCamera(params: {
    camX: number;
    camY: number;
    zoom: number;
    roll: number;
    focusBlurBg: number;
    focusBlurFg: number;
  }): void {
    const cx = FILM_WIDTH * 0.5;
    const cy = FILM_HEIGHT * 0.5;
    const { camX, camY, zoom, roll, focusBlurBg, focusBlurFg } = params;

    for (const layer of this.layers) {
      const effZoom = 1 + (zoom - 1) * layer.zoomWeight;
      layer.container.scale.set(effZoom);
      layer.container.rotation = roll * layer.zoomWeight;
      layer.container.position.set(
        cx - camX * layer.parallaxX * effZoom,
        cy - camY * layer.parallaxY * effZoom
      );

      if (layer.blurFilter) {
        if (layer.name === 'distant') {
          layer.blurFilter.strength = focusBlurBg;
          layer.blurFilter.enabled = focusBlurBg > 0.2;
        } else if (layer.name === 'midground') {
          const midBlur = focusBlurBg * 0.55;
          layer.blurFilter.strength = midBlur;
          layer.blurFilter.enabled = midBlur > 0.2;
        } else if (layer.name === 'foreground') {
          layer.blurFilter.strength = focusBlurFg;
          layer.blurFilter.enabled = focusBlurFg > 0.2;
        }
      }
    }
  }
}
