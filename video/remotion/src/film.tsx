import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { CameraMove, PaperCanvas, SceneTransition, Title, Box, CameraKey } from './components';
import { timeline } from './timeline';

const s = (v: number) => v * 60;
const capture = (v: string) => `video/polish/${v}.png`;
const key = (frame: number, x: number, y: number, zoom: number): CameraKey => ({ frame, x, y, zoom });
const desktop = { x: 0, y: 0, width: 1920, height: 1080 };
const choose = (f: number, changes: [number, string][]) => changes.filter(([t]) => f >= t).at(-1)![1];
const targets: { today: Box; calendar: Box; shopping: Box; gika: Box } = {
  today: { x: 323.58, y: 674.5, width: 22, height: 22 },
  calendar: { x: 671.06, y: 712.53, width: 172.75, height: 112 },
  shopping: { x: 454.1875, y: 568.765625, width: 22, height: 22 },
  gika: { x: 48.1875, y: 351.78125, width: 198, height: 50 }
};

/** The real note is the visual thread: close action, then a quiet pull-back. */
const Opening: React.FC = () => {
  const f = useCurrentFrame();
  const src = choose(f, [[0, 'note-type-0'], [24, 'note-type-1'], [50, 'note-type-2'], [76, 'note-type-3'], [98, 'note-type-4'], [126, 'note-saved'], [151, 'note-offline']]);
  const rectKeys = [
    { frame: 0, rect: desktop },
    { frame: 126, rect: desktop },
    { frame: 195, rect: { x: 760, y: 140, width: 1090, height: 800 } }
  ];
  return <PaperCanvas>
    <CameraMove src={capture(src)} frame={false} rectKeys={rectKeys} keys={[key(0, 820, 440, 1.65), key(85, 820, 440, 1.65), key(145, 820, 440, 1.15), key(195, 920, 440, 1)]} />
    <Title title="Organizar a vida deveria ser leve." x={118} y={390} width={570} size={70} delay={132} />
  </PaperCanvas>;
};

/** A full-frame action makes the checkbox, not a headline, lead the eye. */
const Today: React.FC = () => {
  const f = useCurrentFrame();
  return <PaperCanvas><CameraMove src={capture(f < 170 ? 'today-before' : 'today-after')} frame={false} rect={desktop} keys={[
    key(0, 800, 450, 1), key(90, 800, 450, 1), key(135, 520, 685, 1.85),
    key(195, 520, 685, 1.85), key(290, 720, 555, 1.35), key(430, 800, 450, 1)
  ]} cursor={{ box: targets.today, enter: 118, click: 164, exit: 190 }} /></PaperCanvas>;
};

/** Let the selected day become the cut into the real mobile viewport. */
const Calendar: React.FC = () => {
  const f = useCurrentFrame();
  return <PaperCanvas><CameraMove src={capture(f < 142 ? 'calendar-before' : 'calendar-day')} frame={false} rect={desktop} keys={[
    key(0, 800, 450, 1.12), key(70, 800, 450, 1.12), key(125, 760, 580, 1.6),
    key(170, 760, 580, 1.6), key(260, 760, 580, 1.55), key(390, 800, 450, 1)
  ]} cursor={{ box: targets.calendar, enter: 115, click: 140, exit: 150 }} /></PaperCanvas>;
};

/** No desktop screenshot in a phone frame: this is the captured Pixel 7 viewport. */
const Mobile: React.FC = () => {
  const f = useCurrentFrame();
  const rectKeys = [
    { frame: 0, rect: { x: 1000, y: 24, width: 500, height: 1032 } },
    { frame: 70, rect: { x: 1000, y: 24, width: 500, height: 1032 } },
    { frame: 180, rect: { x: 1050, y: 24, width: 500, height: 1032 } },
    { frame: 240, rect: { x: 1050, y: 24, width: 500, height: 1032 } }
  ];
  return <PaperCanvas>
    <div style={{ position: 'absolute', left: 140, top: 200, width: 760, height: 650, borderRadius: 34, background: 'linear-gradient(145deg, rgba(255,253,250,.74), rgba(227,238,231,.65))', border: '1px solid rgba(206,216,207,.8)' }} />
    <Title eyebrow="NO SEU TEMPO" title="A mesma ideia, mais perto." x={210} y={440} width={620} size={70} delay={14} />
    <CameraMove src={capture(f < 72 ? 'mobile-note-before' : 'mobile-note-open')} viewport={{ width: 390, height: 844 }} rectKeys={rectKeys} keys={[key(0, 195, 422, 1), key(240, 195, 422, 1)]} radius={40} />
  </PaperCanvas>;
};

/** One quiet editorial close; avoid turning the note back into a feature card. */
const Notes: React.FC = () => {
  const f = useCurrentFrame();
  const src = choose(f, [[0, 'note-type-2'], [120, 'note-type-4'], [218, 'note-saved']]);
  return <PaperCanvas><CameraMove src={capture(src)} frame={false} rect={desktop} keys={[
    key(0, 800, 430, 2), key(110, 800, 430, 2), key(185, 820, 455, 2.18), key(330, 820, 455, 2.18), key(460, 800, 430, 1.45)
  ]} /></PaperCanvas>;
};

/** Make the real list response tactile, then reveal its context again. */
const Shopping: React.FC = () => {
  const f = useCurrentFrame();
  const src = f < 180 ? 'shopping-before' : f < 290 ? 'shopping-after' : 'shopping-completed';
  return <PaperCanvas><CameraMove src={capture(src)} frame={false} rect={desktop} keys={[
    key(0, 800, 450, 1), key(78, 800, 450, 1), key(130, 610, 570, 1.8),
    key(205, 610, 570, 1.8), key(285, 610, 570, 1.8), key(360, 800, 450, 1)
  ]} cursor={{ box: targets.shopping, enter: 112, click: 176, exit: 194 }} /></PaperCanvas>;
};

/** Keep the assistant inside the actual Leve workspace; the output is an action. */
const Gika: React.FC = () => {
  const f = useCurrentFrame();
  const src = choose(f, [[0, 'gika-context'], [74, 'gika-open'], [124, 'gika-type-1'], [174, 'gika-type-2'], [218, 'gika-type-3'], [294, 'gika-result']]);
  return <PaperCanvas><CameraMove src={capture(src)} frame={false} rect={desktop} keys={[
    key(0, 800, 450, 1), key(82, 800, 450, 1), key(145, 1130, 565, 1.55),
    key(285, 1130, 565, 1.55), key(370, 1320, 480, 1.8), key(510, 1320, 480, 1.8), key(640, 800, 450, 1)
  ]} cursor={{ box: targets.gika, enter: 34, click: 74, exit: 102 }} /></PaperCanvas>;
};

/** Quiet pause; each state shown is the real offline/outbox/replay capture. */
const Offline: React.FC = () => {
  const f = useCurrentFrame();
  const part = f < 160 ? 0 : f < 315 ? 1 : f < 455 ? 2 : 3;
  const src = part === 0 ? 'offline-banner' : part < 3 ? 'offline-pending' : 'offline-synced';
  const keys = part === 0
    ? [key(0, 800, 450, 1), key(100, 800, 450, 1), key(159, 800, 450, 1.12)]
    : part === 1
      // Keep the real task title legible, with enough of the form to establish context.
      ? [key(160, 700, 350, 1.9), key(314, 700, 350, 1.9)]
      : part === 2
        // Frame the actual outbox status without clipping either end of the sentence.
        ? [key(315, 800, 650, 1.65), key(454, 800, 650, 1.65)]
        : [key(455, 800, 450, 1.45), key(540, 800, 450, 1.45), key(700, 800, 450, 1)];
  return <PaperCanvas><CameraMove src={capture(src)} frame={false} rect={desktop} keys={keys} /></PaperCanvas>;
};

/** Return to the same paper note; the Leve mark remains in the real app UI. */
const Closing: React.FC = () => {
  const f = useCurrentFrame();
  return <PaperCanvas>
    <CameraMove src={capture('note-saved')} frame={false} rect={desktop} keys={[
      key(0, 645, 500, 2.35), key(100, 645, 500, 2.35), key(205, 645, 500, 1.65), key(330, 800, 450, 1)
    ]} />
    <Title title="Mais espaço para viver." x={1100} y={414} width={700} size={74} delay={205} />
  </PaperCanvas>;
};

const scenes = { opening: Opening, today: Today, calendar: Calendar, mobile: Mobile, notes: Notes, shopping: Shopping, gika: Gika, offline: Offline, closing: Closing };
// Scenes are sequential, so fades/reveals here briefly exposed the empty canvas.
// Keep the edit crisp; camera motion and matching UI states carry the transitions.
const transition: Record<string, 'cut'> = {
  opening: 'cut', today: 'cut', calendar: 'cut', mobile: 'cut', notes: 'cut',
  shopping: 'cut', gika: 'cut', offline: 'cut', closing: 'cut'
};

export const LeveProductFilm: React.FC = () => <AbsoluteFill>{timeline.map(scene => {
  const Component = scenes[scene.id];
  return <Sequence key={scene.id} from={s(scene.from)} durationInFrames={s(scene.duration)}>
    <SceneTransition duration={s(scene.duration)} mode={transition[scene.id]}><Component /></SceneTransition>
  </Sequence>;
})}</AbsoluteFill>;
