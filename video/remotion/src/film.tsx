import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { CameraMove, PaperCanvas, SceneTransition, Title, Box, CameraKey } from './components';
import { palette } from './tokens';
import { timeline } from './timeline';
const s = (v: number) => v * 60;
const capture = (v: string) => `video/polish/${v}.png`;
const old = (v: string) => `video/captures/${v}.png`;
const key = (frame: number, x: number, y: number, zoom: number): CameraKey => ({
  frame,
  x,
  y,
  zoom
});
// Measured CSS target boxes are replaced from the captured manifest before rendering.
const targets: {
  today: Box;
  calendar: Box;
  shopping: Box;
  gika: Box;
} = {
  today: {
    x: 323.58,
    y: 674.5,
    width: 22,
    height: 22
  },
  calendar: {
    x: 671.06,
    y: 712.53,
    width: 172.75,
    height: 112
  },
  shopping: {
    x: 454.1875,
    y: 568.765625,
    width: 22,
    height: 22
  },
  gika: {
    x: 48.1875,
    y: 351.78125,
    width: 198,
    height: 50
  }
};
const choose = (f: number, changes: [number, string][]) => changes.filter(([t]) => f >= t).at(-1)![1];
const Logo: React.FC = () => <div style={{
  width: 255,
  height: 137,
  overflow: 'hidden',
  position: 'relative'
}}><Img src={staticFile(old('opening-brand'))} style={{
    position: 'absolute',
    left: 0,
    top: 0,
    width: 600,
    height: 137,
    maxWidth: 'none'
  }} /></div>;
const Opening: React.FC = () => {
  const f = useCurrentFrame();
  const src = choose(f, [[0, 'note-type-0'], [28, 'note-type-1'], [54, 'note-type-2'], [78, 'note-type-3'], [98, 'note-type-4'], [124, 'note-saved'], [150, 'note-offline']]);
  return <PaperCanvas><CameraMove src={capture(src)} rect={{
      x: 110,
      y: 84,
      width: 1700,
      height: 930
    }} keys={f < 124 ? [key(0, 680, 370, 1.5), key(112, 680, 370, 1.5)] : f < 150 ? [key(124, 680, 450, 1.08)] : [key(150, 760, 450, 1), key(180, 760, 450, 1)]} /></PaperCanvas>;
};
const Brand: React.FC = () => {
  const f = useCurrentFrame();
  const reveal = interpolate(f, [70, 106], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(.22, .68, .2, 1)
  });
  return <PaperCanvas><Title title="Organizar a vida deveria ser leve." x={250} y={265} width={1300} size={90} /><div style={{
      position: 'absolute',
      left: 260,
      top: 600,
      clipPath: `inset(0 ${100 - reveal}% 0 0)`
    }}><Logo /></div></PaperCanvas>;
};
const Today: React.FC = () => {
  const f = useCurrentFrame();
  return <PaperCanvas><Title eyebrow="MEU DIA" title="Seu dia, em perspectiva." /><CameraMove src={capture(f < 260 ? 'today-before' : 'today-after')} keys={[key(0, 800, 450, 1), key(125, 800, 450, 1), key(220, targets.today.x + 360, targets.today.y - 110, 1.35), key(318, targets.today.x + 360, targets.today.y - 110, 1.35), key(425, 800, 450, 1)]} cursor={{
      box: targets.today,
      enter: 214,
      click: 260,
      exit: 308
    }} /></PaperCanvas>;
};
const Calendar: React.FC = () => {
  const f = useCurrentFrame();
  return <PaperCanvas><Title title="Veja seus dias tomar forma." eyebrow="CALENDÁRIO" /><CameraMove src={capture(f < 185 ? 'calendar-before' : 'calendar-day')} keys={f < 185 ? [key(0, 800, 450, 1), key(95, 800, 450, 1), key(166, 850, 580, 1.2)] : [key(185, 800, 450, 1), key(270, 800, 620, 1.35), key(375, 850, 620, 1.35)]} cursor={{
      box: targets.calendar,
      enter: 140,
      click: 182,
      exit: 185
    }} /></PaperCanvas>;
};
const Mobile: React.FC = () => {
  const f = useCurrentFrame();
  return <PaperCanvas><Title eyebrow="LEVE, COM VOCÊ" title="O mesmo espaço. No seu ritmo." x={180} y={360} width={700} size={72} /><CameraMove src={capture(f < 72 ? 'mobile-note-before' : 'mobile-note-open')} viewport={{
      width: 390,
      height: 844
    }} rect={{
      x: 1080,
      y: 42,
      width: 455,
      height: 984
    }} radius={38} keys={[key(0, 195, 422, 1), key(239, 195, 422, 1)]} /></PaperCanvas>;
};
const Notes: React.FC = () => {
  const f = useCurrentFrame();
  return <PaperCanvas><Title eyebrow="NOTAS" title="Ideias também têm lugar." x={130} y={350} width={540} size={70} /><CameraMove src={capture(f < 160 ? 'note-type-2' : f < 210 ? 'note-type-4' : 'note-saved')} rect={{
      x: 750,
      y: 106,
      width: 1090,
      height: 888
    }} keys={f < 210 ? [key(0, 675, 370, 1.6), key(120, 675, 370, 1.6), key(200, 675, 370, 1.7)] : [key(210, 505, 570, 2), key(330, 505, 570, 2), key(420, 505, 570, 1.85)]} /></PaperCanvas>;
};
const Shopping: React.FC = () => {
  const f = useCurrentFrame();
  return <PaperCanvas><Title eyebrow="COMPRAS" title="Até o cotidiano ganha espaço." /><CameraMove src={capture(f < 195 ? 'shopping-before' : f < 280 ? 'shopping-after' : 'shopping-completed')} keys={[key(0, 800, 450, 1), key(65, 800, 450, 1), key(150, targets.shopping.x + 350, targets.shopping.y - 100, 1.4), key(245, targets.shopping.x + 350, targets.shopping.y - 100, 1.4), key(365, 850, 480, 1.1)]} cursor={{
      box: targets.shopping,
      enter: 150,
      click: 195,
      exit: 198
    }} /></PaperCanvas>;
};
const Gika: React.FC = () => {
  const f = useCurrentFrame();
  const cameraPhase = interpolate(f, [90, 160, 400, 540], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(.22, .68, .2, 1)
  });
  const src = choose(f, [[0, 'gika-context'], [75, 'gika-open'], [126, 'gika-type-1'], [170, 'gika-type-2'], [215, 'gika-type-3'], [295, 'gika-result']]);
  return <PaperCanvas><Title eyebrow="GIKA" title="Uma ideia vira próximo passo." /><CameraMove src={capture(src)} rect={{
      x: 100 + cameraPhase * 600,
      y: 160,
      width: 1720 - cameraPhase * 600,
      height: 865
    }} keys={[key(0, 800, 450, 1), key(90, 800, 450, 1), key(160, 1200, 605, 2), key(285, 1200, 605, 2), key(350, 1267, 340, 2.4), key(430, 1267, 340, 2.4), key(540, 800, 450, 1)]} cursor={{
      box: targets.gika,
      enter: 35,
      click: 75,
      exit: 100
    }} /></PaperCanvas>;
};
const Offline: React.FC = () => {
  const f = useCurrentFrame();
  const part = f < 210 ? 0 : f < 465 ? 1 : 2;
  const src = part === 0 ? 'offline-banner' : part === 1 ? 'offline-pending' : 'offline-synced';
  const title = part === 0 ? 'Sua agenda já aberta, ainda por perto.' : part === 1 ? 'Esta tarefa espera a conexão voltar.' : 'Conexão de volta. Tarefa na agenda.';
  return <PaperCanvas><Title eyebrow={part < 2 ? 'CONEXÃO PAUSADA' : 'DE VOLTA'} title={title} x={130} y={370} width={560} size={59} /><CameraMove src={capture(src)} rect={{
      x: 740,
      y: 86,
      width: 1110,
      height: 920
    }} keys={part === 0 ? [key(0, 730, 460, 1), key(70, 730, 460, 1), key(165, 750, 470, 1.02)] : part === 1 ? [key(210, 730, 445, 1), key(300, 730, 445, 1), key(410, 730, 510, 1.02)] : [key(465, 750, 460, 1.02), key(595, 730, 460, 1)]} /></PaperCanvas>;
};
const Closing: React.FC = () => {
  const f = useCurrentFrame();
  const end = interpolate(f, [272, 300], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  return <PaperCanvas><CameraMove src={capture('note-saved')} rect={{
      x: 850,
      y: 100,
      width: 1010,
      height: 890
    }} keys={[key(0, 505, 570, 2.15), key(100, 505, 570, 2.15), key(175, 505, 570, 1.92)]} /><Title title="Mais espaço para viver." x={140} y={370} width={660} size={82} /><AbsoluteFill style={{
      opacity: end,
      background: palette.canvas,
      alignItems: 'center',
      justifyContent: 'center'
    }}><Logo /></AbsoluteFill></PaperCanvas>;
};
const scenes = {
  opening: Opening,
  brand: Brand,
  today: Today,
  calendar: Calendar,
  mobile: Mobile,
  notes: Notes,
  shopping: Shopping,
  gika: Gika,
  offline: Offline,
  closing: Closing
};
export const LeveProductFilm: React.FC = () => <AbsoluteFill style={{
  background: palette.canvas
}}>{timeline.map(scene => {
    const Component = scenes[scene.id];
    return <Sequence key={scene.id} from={s(scene.from)} durationInFrames={s(scene.duration)}><SceneTransition duration={s(scene.duration)} mode={['notes', 'mobile', 'gika'].includes(scene.id) ? 'sheet' : scene.id === 'brand' ? 'fade' : 'cut'}><Component /></SceneTransition></Sequence>;
  })}</AbsoluteFill>;
