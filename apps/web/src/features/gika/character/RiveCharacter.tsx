import { useEffect, useRef, useState } from 'react';
import { Alignment, Fit, Layout, Rive, RuntimeLoader } from '@rive-app/canvas';
import wasmUrl from '@rive-app/canvas/rive.wasm?url';
import rigUrl from '../../../../../../assets/gika/rive/essential-bust/gika-essential-bust.riv?url';
import { characterModes, type CharacterState } from './controller';
RuntimeLoader.setWasmUrl(wasmUrl);
RuntimeLoader.setWasmFallbackUrl(null); // Never download runtime code from a CDN.

export default function RiveCharacter({ state }: { state: CharacterState }) {
  const canvas = useRef<HTMLCanvasElement>(null), runtime = useRef<Rive | null>(null);
  const current = useRef(state); current.current = state;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let disposed = false;
    const fail = () => { if (!disposed) { disposed = true; window.clearTimeout(timer); setReady(false); runtime.current?.cleanup(); runtime.current = null; } };
    const timer = window.setTimeout(fail, 8_000);
    const rive = new Rive({
      src: rigUrl, canvas: element, artboard: 'GikaEssential', stateMachine: 'GikaEssential',
      autoplay: true, autoBind: true, shouldDisableRiveListeners: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        if (disposed) return;
        const mode = rive.viewModelInstance?.number('mode');
        if (!mode) { fail(); return; }
        mode.value = characterModes[current.current]; rive.resizeDrawingSurfaceToCanvas();
        window.clearTimeout(timer); setReady(true);
      },
      onLoadError: fail,
    });
    runtime.current = rive;
    const resize = new ResizeObserver(() => { if (!disposed) runtime.current?.resizeDrawingSurfaceToCanvas(); });
    resize.observe(element);
    return () => { disposed = true; window.clearTimeout(timer); resize.disconnect(); rive.cleanup(); runtime.current = null; };
  }, []);
  useEffect(() => {
    const mode = runtime.current?.viewModelInstance?.number('mode');
    if (mode) mode.value = characterModes[state];
  }, [state]);
  return <canvas ref={canvas} data-rive-ready={ready} width="135" height="133" />;
}
