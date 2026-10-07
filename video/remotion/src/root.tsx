import React from 'react';
import {Composition} from 'remotion';
import {LeveProductFilm} from './film';
import {RenderSpike} from './spike';

export const FilmRoot: React.FC = () => (
  <>
    <Composition id="LeveProductFilm" component={LeveProductFilm} width={1920} height={1080} fps={60} durationInFrames={4560} />
    <Composition id="RenderSpike" component={RenderSpike} width={1920} height={1080} fps={60} durationInFrames={180} />
  </>
);
