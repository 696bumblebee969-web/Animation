import React from 'react';
import { Composition } from 'remotion';
import { FilmComposition } from './FilmComposition';
import { FILM_FPS, FILM_HEIGHT, FILM_TOTAL_FRAMES, FILM_WIDTH } from '../types';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TheLastStar"
      component={FilmComposition}
      durationInFrames={FILM_TOTAL_FRAMES}
      fps={FILM_FPS}
      width={FILM_WIDTH}
      height={FILM_HEIGHT}
    />
  );
};
