import React, { useEffect, useLayoutEffect, useRef } from 'react';
import {
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { LastStarEngine } from '../main';
import { FILM_HEIGHT, FILM_WIDTH } from '../types';

export const FilmComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LastStarEngine | null>(null);
  const frameRef = useRef<number>(frame);
  frameRef.current = frame;

  const [initHandle] = React.useState(() => delayRender('Initializing PixiJS WebGL Engine'));

  useEffect(() => {
    let mounted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    LastStarEngine.create(canvas)
      .then((engine) => {
        if (!mounted) {
          engine.destroy();
          return;
        }
        engineRef.current = engine;
        engine.renderAtTime(frameRef.current / fps);
        continueRender(initHandle);
      })
      .catch((err) => {
        console.error('Failed to initialize LastStarEngine:', err);
        continueRender(initHandle);
      });

    return () => {
      mounted = false;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [fps, initHandle]);

  useLayoutEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.renderAtTime(frame / fps);
  }, [frame, fps]);

  return (
    <div
      style={{
        width: FILM_WIDTH,
        height: FILM_HEIGHT,
        backgroundColor: '#040711',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        width={FILM_WIDTH}
        height={FILM_HEIGHT}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};
