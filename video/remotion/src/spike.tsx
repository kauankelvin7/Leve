import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {palette, fonts} from './tokens';

export const RenderSpike: React.FC = () => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 28, 155, 179], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const lift = interpolate(f, [0, 40], [22, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{background: palette.canvas, color: palette.ink, fontFamily: fonts.body, justifyContent: 'center', padding: 128}}>
    <div style={{position: 'absolute', inset: 48, border: `1px solid ${palette.line}`, borderRadius: 28, background: 'linear-gradient(135deg, rgba(255,255,255,.4), transparent 46%)'}} />
    <div style={{opacity, transform: `translateY(${lift}px)`, position: 'relative'}}>
      <div style={{fontFamily: fonts.brand, fontWeight: 800, color: palette.green, fontSize: 26, letterSpacing: 2, marginBottom: 26}}>LEVE <span style={{opacity:.45}}> / </span> FILME DE PRODUTO</div>
      <div style={{fontFamily: fonts.brand, fontWeight: 800, fontSize: 84, letterSpacing: -3, lineHeight: 1.08, maxWidth: 1200}}>Um espaço para o que importa.</div>
      <div style={{fontSize: 28, color: palette.muted, marginTop: 28}}>Render spike editorial — sem capturas de produto.</div>
    </div>
  </AbsoluteFill>;
};
