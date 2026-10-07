import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion';
import {CameraMove, PaperCanvas, ProductFrame, SceneTransition, Title} from './components';
import {fonts, palette} from './tokens';

const seconds = (s: number) => s * 60;

type ScreenSceneProps = {
  src: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  disclosure?: string;
  move?: 'in' | 'out';
};

const ScreenScene: React.FC<ScreenSceneProps> = ({src, eyebrow, title, subtitle, disclosure, move='in'}) => {
  return <PaperCanvas>
    <CameraMove duration={600} direction={move}>
      <ProductFrame src={`video/captures/${src}`} />
    </CameraMove>
    <Title eyebrow={eyebrow} title={title} subtitle={subtitle} disclosure={disclosure} />
  </PaperCanvas>;
};

const BrandScene: React.FC = () => {
  const f=useCurrentFrame();

  const scale=interpolate(f,[0,48],[.975,1],{extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{background:`radial-gradient(ellipse at 52% 42%, #fdfcf8, ${palette.canvas} 76%)`,justifyContent:'center',alignItems:'center'}}>
    <div style={{position:'absolute',inset:56,border:`1px solid ${palette.line}`,borderRadius:palette.radius,background:'linear-gradient(145deg,rgba(255,255,255,.44),transparent 60%)'}} />
    <div style={{transform:`scale(${scale})`,width:1180,display:'flex',alignItems:'center',flexDirection:'column',position:'relative'}}>
      <div style={{width:255,height:137,overflow:'hidden',position:'relative'}}>
        <Img src={staticFile('video/captures/opening-brand.png')} style={{position:'absolute',left:0,top:0,width:600,height:137,objectFit:'fill',filter:`drop-shadow(0 18px 40px rgba(27,51,40,.16))`}} />
      </div>
      <div style={{marginTop:42,width:780,height:1,background:palette.line}} />
      <div style={{marginTop:30,fontFamily:fonts.brand,fontSize:42,fontWeight:800,letterSpacing:-1.1,color:palette.ink}}>Organizar a vida deveria ser leve.</div>
    </div>
  </AbsoluteFill>;
};

const MobileCalendar: React.FC = () => {
  const f=useCurrentFrame();
  const y=interpolate(f,[0,28],[18,0],{extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)});
  return <PaperCanvas>
    <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}>
      <div style={{width:494,height:1060,boxSizing:'border-box',padding:10,borderRadius:46,background:'rgba(255,255,255,.55)',border:`1px solid ${palette.line}`,boxShadow:palette.shadow,transform:`translateY(${y}px)`}}>
        <Img src={staticFile('video/captures/mobile/calendar-mobile.png')} style={{display:'block',height:'100%',width:'100%',objectFit:'cover',borderRadius:36}} />
      </div>
    </div>
    <div style={{position:'absolute',right:104,bottom:130,maxWidth:330,padding:'20px 24px',border:`1px solid ${palette.line}`,borderRadius:16,background:palette.glass,color:palette.muted,fontFamily:fonts.body,fontSize:20,lineHeight:1.4,boxShadow:'0 12px 40px rgba(36,54,44,.09)'}}>Uma visão diária em uma tela compacta.</div>
  </PaperCanvas>;
};

const OfflineShot: React.FC<{src:string; frames:number; direction?:'in'|'out'}> = ({src,frames,direction='in'}) => {
  const f=useCurrentFrame();
  const opacity=interpolate(f,[0,16,frames-16,frames],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.quad)});
  return <AbsoluteFill style={{opacity}}><CameraMove duration={frames} direction={direction}><ProductFrame src={`video/captures/${src}`} /></CameraMove></AbsoluteFill>;
};

const OfflineSequence: React.FC = () => {
  const frame=useCurrentFrame();
  return <PaperCanvas>
    <Sequence from={0} durationInFrames={seconds(2)}>
      <OfflineShot src="today.png" frames={seconds(2)} />
    </Sequence>
    <Sequence from={seconds(2)} durationInFrames={seconds(4)+15}>
      <OfflineShot src="offline-banner.png" frames={seconds(4)+15} />
    </Sequence>
    <Sequence from={seconds(6)} durationInFrames={seconds(4)+15}>
      <OfflineShot src="offline-pending.png" frames={seconds(4)+15} />
    </Sequence>
    <Sequence from={seconds(10)} durationInFrames={seconds(3)}>
      <OfflineShot src="offline-synced.png" frames={seconds(3)} direction="out" />
    </Sequence>
    {frame >= seconds(2) && frame < seconds(6) && <Title eyebrow="CONEXÃO PAUSADA" title="Dados consultados antes podem continuar disponíveis." />}
    {frame >= seconds(6) && frame < seconds(10) && <Title eyebrow="CONEXÃO PAUSADA" title="Dados consultados antes podem continuar disponíveis." subtitle="Uma tarefa compatível aguarda a conexão voltar." />}
    {frame >= seconds(10) && <Title eyebrow="CONEXÃO RESTABELECIDA" title="A tarefa aparece na agenda." subtitle="Depois que a conexão volta." />}
  </PaperCanvas>;
};

const ClosingScene: React.FC = () => {
  const f=useCurrentFrame();
  const brandOpacity=interpolate(f,[seconds(4),seconds(4.8),seconds(5.2)],[0,1,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.quad)});
  return <PaperCanvas>
    <CameraMove duration={seconds(5)} direction="out"><ProductFrame src="video/captures/closing-same-note.png" /></CameraMove>
    <Title eyebrow="LEVE" title="Mais espaço para viver." subtitle="Um espaço pessoal para o que você quer lembrar e fazer." />
    <AbsoluteFill style={{opacity:brandOpacity,background:`radial-gradient(ellipse at 52% 42%, #fdfcf8, ${palette.canvas} 76%)`,justifyContent:'center',alignItems:'center'}}>
      <div style={{width:255,height:137,overflow:'hidden',position:'relative'}}>
        <Img src={staticFile('video/captures/opening-brand.png')} style={{position:'absolute',left:0,top:0,width:600,height:137,objectFit:'fill'}} />
      </div>
    </AbsoluteFill>
  </PaperCanvas>;
};

const Shot: React.FC<{duration:number; children:React.ReactNode}> = ({duration,children}) => <SceneTransition duration={duration}>{children}</SceneTransition>;

export const LeveProductFilm: React.FC = () => <AbsoluteFill style={{background:palette.canvas}}>
  <Sequence from={0} durationInFrames={seconds(5)+15}>
    <Shot duration={seconds(5)+15}><ScreenScene src="opening-today.png" eyebrow="SUA AGENDA PESSOAL" title="Um espaço para o que importa." move="in" /></Shot>
  </Sequence>
  <Sequence from={seconds(5)} durationInFrames={seconds(5)+15}>
    <Shot duration={seconds(5)+15}><BrandScene /></Shot>
  </Sequence>
  <Sequence from={seconds(10)} durationInFrames={seconds(10)+15}>
    <Shot duration={seconds(10)+15}><ScreenScene src="today.png" eyebrow="MEU DIA" title="Seu dia, em perspectiva." subtitle="Agenda e tarefas no mesmo espaço pessoal." /></Shot>
  </Sequence>
  <Sequence from={seconds(20)} durationInFrames={seconds(8)+15}>
    <Shot duration={seconds(8)+15}>
      <AbsoluteFill>
        <Sequence from={0} durationInFrames={seconds(3)}>
          <ScreenScene src="calendar.png" eyebrow="CALENDÁRIO" title="Veja a semana tomar forma." move="in" />
        </Sequence>
        <Sequence from={seconds(3)} durationInFrames={seconds(2)}><MobileCalendar /></Sequence>
        <Sequence from={seconds(5)} durationInFrames={seconds(3)}>
          <ScreenScene src="calendar.png" eyebrow="CALENDÁRIO" title="Veja a semana tomar forma." move="out" />
        </Sequence>
      </AbsoluteFill>
    </Shot>
  </Sequence>
  <Sequence from={seconds(28)} durationInFrames={seconds(10)+15}>
    <Shot duration={seconds(10)+15}><ScreenScene src="notes.png" eyebrow="NOTAS" title="Ideias também têm lugar." subtitle="Notas que você pode editar." /></Shot>
  </Sequence>
  <Sequence from={seconds(38)} durationInFrames={seconds(7)+15}>
    <Shot duration={seconds(7)+15}><ScreenScene src="shopping.png" eyebrow="COMPRAS" title="E até as pequenas compras encontram seu lugar." move="in" /></Shot>
  </Sequence>
  <Sequence from={seconds(45)} durationInFrames={seconds(11)+15}>
    <Shot duration={seconds(11)+15}><ScreenScene src="gika.png" eyebrow="GIKA · AJUDA COM CONTEXTO" title="Uma ideia pode virar próximo passo." subtitle="Gika ajuda a organizar a agenda." disclosure="Demonstração controlada · resposta do modelo predefinida" /></Shot>
  </Sequence>
  <Sequence from={seconds(56)} durationInFrames={seconds(13)+15}>
    <Shot duration={seconds(13)+15}><OfflineSequence /></Shot>
  </Sequence>
  <Sequence from={seconds(69)} durationInFrames={seconds(7)}>
    <Shot duration={seconds(7)}><ClosingScene /></Shot>
  </Sequence>
</AbsoluteFill>;
