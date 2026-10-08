import React from 'react';
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { fonts, palette } from './tokens';
export type CameraKey = {
  frame: number;
  x: number;
  y: number;
  zoom: number;
};
export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};
const ease = Easing.bezier(.22, .68, .2, 1);
const tween = (f: number, keys: CameraKey[], field: 'x' | 'y' | 'zoom') => keys.length === 1 ? keys[0][field] : interpolate(f, keys.map(k => k.frame), keys.map(k => k[field]), {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: ease
});
/** Camera coordinates and cursor targets are measured in the captured CSS viewport. */
export const CameraMove: React.FC<{
  src: string;
  keys: CameraKey[];
  viewport?: {
    width: number;
    height: number;
  };
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cursor?: {
    box: Box;
    click: number;
    enter: number;
    exit: number;
  };
  radius?: number;
}> = ({
  src,
  keys,
  viewport = {
    width: 1600,
    height: 900
  },
  rect = {
    x: 100,
    y: 160,
    width: 1720,
    height: 865
  },
  cursor,
  radius = 24
}) => {
  const f = useCurrentFrame();
  const zoom = tween(f, keys, 'zoom');
  const cx = tween(f, keys, 'x');
  const cy = tween(f, keys, 'y');
  const scale = Math.max(rect.width / viewport.width * zoom, rect.width / viewport.width, rect.height / viewport.height);
  const left = Math.max(rect.width - viewport.width * scale, Math.min(0, rect.width / 2 - cx * scale));
  const top = Math.max(rect.height - viewport.height * scale, Math.min(0, rect.height / 2 - cy * scale));
  return <div style={{
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    overflow: 'hidden',
    borderRadius: radius,
    background: palette.paper,
    boxShadow: palette.shadow,
    border: `1px solid ${palette.line}`
  }}>
   <Img src={staticFile(src)} style={{
      position: 'absolute',
      left,
      top,
      width: viewport.width * scale,
      height: viewport.height * scale,
      maxWidth: 'none'
    }} />
   {cursor && <Cursor x={left + (cursor.box.x + cursor.box.width / 2) * scale} y={top + (cursor.box.y + cursor.box.height / 2) * scale} enter={cursor.enter} click={cursor.click} exit={cursor.exit} />}
 </div>;
};
export const Cursor: React.FC<{
  x: number;
  y: number;
  enter: number;
  click: number;
  exit: number;
}> = ({
  x,
  y,
  enter,
  click,
  exit
}) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [enter, enter + 14, exit - 12, exit], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const approach = interpolate(f, [enter, click - 9], [22, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease
  });
  const press = interpolate(f, [click - 5, click, click + 10], [1, .88, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  return <svg width="32" height="40" viewBox="0 0 32 40" style={{
    position: 'absolute',
    left: x + approach,
    top: y + approach,
    opacity,
    transform: `scale(${press})`,
    transformOrigin: '2px 2px',
    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.2))'
  }}><path d="M3 2 L3 29 L10 22 L16 35 L21 33 L15 20 L26 19 Z" fill="#FFFDFA" stroke="#1B3328" strokeWidth="1.7" /></svg>;
};
export const Title: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  x?: number;
  y?: number;
  width?: number;
  size?: number;
  delay?: number;
}> = ({
  eyebrow,
  title,
  subtitle,
  x = 112,
  y = 42,
  width = 1500,
  size = 48,
  delay = 0
}) => {
  const f = useCurrentFrame() - delay;
  const opacity = interpolate(f, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const lift = interpolate(f, [0, 30], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease
  });
  return <div style={{
    position: 'absolute',
    left: x,
    top: y,
    width,
    zIndex: 4,
    opacity,
    transform: `translateY(${lift}px)`
  }}>
 {eyebrow && <div style={{
      fontFamily: fonts.body,
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: 2,
      color: palette.green,
      marginBottom: 9
    }}>{eyebrow}</div>}
 <div style={{
      fontFamily: fonts.brand,
      fontSize: size,
      fontWeight: 800,
      lineHeight: 1.08,
      letterSpacing: -1.6,
      color: palette.ink
    }}>{title}</div>
 {subtitle && <div style={{
      fontFamily: fonts.body,
      fontSize: 21,
      color: palette.muted,
      lineHeight: 1.5,
      marginTop: 20,
      maxWidth: 560
    }}>{subtitle}</div>}
 </div>;
};
export const SceneTransition: React.FC<{
  duration: number;
  mode?: 'cut' | 'fade' | 'sheet';
  children: React.ReactNode;
}> = ({
  duration,
  mode = 'cut',
  children
}) => {
  const f = useCurrentFrame();
  const opacity = mode === 'fade' ? interpolate(f, [0, 18, duration - 14, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  }) : 1;
  const inset = mode === 'sheet' ? interpolate(f, [0, 28], [100, 0], {
    extrapolateRight: 'clamp',
    easing: ease
  }) : 0;
  return <div style={{
    position: 'absolute',
    inset: 0,
    opacity,
    clipPath: `inset(0 ${inset}% 0 0 round 0px)`
  }}>{children}</div>;
};
export const PaperCanvas: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => <div style={{
  position: 'absolute',
  inset: 0,
  background: `radial-gradient(ellipse at 12% 5%, #fffdfb 0%, ${palette.canvasGlow} 34%, ${palette.canvas} 100%)`,
  fontFamily: fonts.body,
  overflow: 'hidden'
}}>
 <div style={{
    position: 'absolute',
    left: 64,
    top: 40,
    width: 1,
    height: 1000,
    background: `linear-gradient(transparent,${palette.line},transparent)`,
    opacity: .55
  }} />{children}
</div>;
// Kept for the existing pipeline's external callers.
export const ProductFrame: React.FC<{
  src: string;
  mobile?: boolean;
}> = ({
  src
}) => <CameraMove src={src} keys={[{
  frame: 0,
  x: 800,
  y: 450,
  zoom: 1
}]} />;
