import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {fonts, palette} from './tokens';

export const ProductFrame: React.FC<{src: string; mobile?: boolean}> = ({src, mobile}) => (
  <div style={{position:'absolute', left: mobile ? 570 : 180, top: mobile ? 212 : 190, width: mobile ? 780 : 1560, height: mobile ? 836 : 877, padding: 8, borderRadius: mobile ? 42 : 26, background: 'rgba(255,255,255,.5)', border: `1px solid ${palette.line}`, boxShadow: palette.shadow, overflow:'hidden'}}>
    <Img src={staticFile(src)} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',borderRadius: mobile ? 32 : 18,display:'block'}} />
  </div>
);

export const CameraMove: React.FC<{children: React.ReactNode; duration: number; direction?: 'in'|'out'}> = ({children, duration, direction='in'}) => {
  const frame=useCurrentFrame();
  const t=interpolate(frame,[0,duration],[0,1],{extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
  const scale=direction==='in'?interpolate(t,[0,1],[1,1.025]):interpolate(t,[0,1],[1.025,1]);
  return <div style={{position:'absolute',inset:0,transform:`scale(${scale})`}}>{children}</div>;
};

export const Title: React.FC<{eyebrow:string; title:string; subtitle?:string; disclosure?:string}> = ({eyebrow,title,subtitle,disclosure}) => {
  const f=useCurrentFrame();
  const opacity=interpolate(f,[0,22],[0,1],{extrapolateRight:'clamp',easing:Easing.out(Easing.quad)});
  const y=interpolate(f,[0,28],[14,0],{extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)});
  const size=title.length > 38 ? 40 : 50;
  return <div style={{position:'absolute',left:142,right:142,top:32,zIndex:2,opacity,transform:`translateY(${y}px)`,display:'flex',alignItems:'end',gap:28}}>
    <div style={{minWidth:0,flex:'1 1 auto',maxWidth:disclosure ? 760 : 980}}>
      <div style={{fontFamily:fonts.body,fontSize:16,fontWeight:600,letterSpacing:2.1,textTransform:'uppercase',color:palette.green,marginBottom:7}}>{eyebrow}</div>
      <div style={{fontFamily:fonts.brand,fontSize:size,lineHeight:1.03,fontWeight:800,letterSpacing:-1.6,color:palette.ink,whiteSpace:'normal'}}>{title}</div>
    </div>
    {subtitle && <div style={{flex:'0 1 auto',maxWidth:disclosure ? 310 : 430,padding:'0 0 4px 22px',borderLeft:`1px solid ${palette.line}`,fontFamily:fonts.body,fontSize:18,lineHeight:1.38,color:palette.muted}}>{subtitle}</div>}
    {disclosure && <div style={{flex:'0 0 auto',maxWidth:340,alignSelf:'end',fontFamily:fonts.body,fontSize:14,lineHeight:1.35,fontWeight:600,color:palette.muted,background:palette.glass,border:`1px solid ${palette.line}`,borderRadius:12,padding:'11px 14px',marginBottom:1}}>{disclosure}</div>}
  </div>;
};

export const SceneTransition: React.FC<{duration: number; children: React.ReactNode}> = ({duration,children})=>{
 const f=useCurrentFrame(); const opacity=interpolate(f,[0,22,duration-18,duration],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.quad)});
 return <div style={{position:'absolute',inset:0,opacity,overflow:'hidden'}}>{children}</div>;
};

export const PaperCanvas: React.FC<{children:React.ReactNode}> = ({children})=><div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 12% 5%, #fffdfb 0%, ${palette.canvasGlow} 34%, ${palette.canvas} 100%)`,color:palette.ink,fontFamily:fonts.body,overflow:'hidden'}}>
  <div style={{position:'absolute',left:0,right:0,top:0,height:12,background:`linear-gradient(90deg,${palette.green},#77a88a 40%,#cfddd2)`,opacity:.88}} />
  <div style={{position:'absolute',left:66,top:52,width:1,height:976,background:`linear-gradient(transparent,${palette.line},transparent)`,opacity:.6}} />
  {children}
</div>;
