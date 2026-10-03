import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/nunito/latin-800.css';
import { GikaCharacter, useCharacterPresentation } from '../features/gika/character/GikaCharacter';
import { characterModes, characterState, type CharacterActivity, type CharacterState } from '../features/gika/character/controller';
import { applyAppearance, applyColorTheme } from '../platform/theme';
import tokens from '../../../../design-tokens.json';
import '../styles/app.css';
import '../styles/glass.css';
import '../styles/theme-runtime.css';
import '../features/gika/gika.css';
import './gika-character-review.css';

for (const [group, values] of Object.entries(tokens)) for (const [name, value] of Object.entries(values)) document.documentElement.style.setProperty(`--${group}-${name}`, value);
applyColorTheme('green', false);

function GikaCharacterReview() {
  const [selected, setSelected] = useState<CharacterState>('idle');
  const [size, setSize] = useState(120);
  const [dark, setDark] = useState(false), [solid, setSolid] = useState(false), [reduce, setReduce] = useState(false);
  const [framed, setFramed] = useState(true), [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const { visible, reducedMotion } = useCharacterPresentation(reduce);
  const semantic = characterState({ open: selected !== 'rest', online: selected !== 'offline', visible, reducedMotion,
    requestPending: selected === 'thinking', voiceListening: selected === 'listening',
    activity: (['idle', 'thinking', 'clarify', 'success', 'error'].includes(selected) ? selected : 'idle') as CharacterActivity });
  // Blink is an existing authored mode, inspected directly; all other states use the product controller.
  const state = selected === 'blink' && !reducedMotion && visible ? 'blink' : semantic;
  const animate = visible && !reducedMotion;
  useEffect(() => { applyAppearance(dark ? 'dark' : 'light', false); }, [dark]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const update = () => setReady(!!element.querySelector('canvas[data-rive-ready="true"]'));
    const observer = new MutationObserver(update);
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-rive-ready'] });
    update();
    return () => observer.disconnect();
  }, []);
  return <main className={`character-review${solid ? ' solid' : ''}`} data-framing={framed ? 'portrait' : 'plain'}>
    <header><p>Leve · desenvolvimento</p><h1>Revisão visual da Gika</h1><p>Mesmo busto, rig e runtime do painel. Nenhuma ação na agenda.</p></header>
    <section className="character-review-stage" aria-label="Personagem em revisão">
      <div ref={host} className="character-review-actor" style={{ width: size, height: size }}><GikaCharacter state={state} animate={animate} /></div>
      <dl aria-live="polite"><div><dt>Estado semântico</dt><dd>{state}</dd></div><div><dt>Tamanho</dt><dd>{size} × {size} CSS px</dd></div><div><dt>reducedMotion</dt><dd>{String(reducedMotion)}</dd></div><div><dt>Renderer</dt><dd>{ready ? 'ready' : 'fallback'}</dd></div></dl>
    </section>
    <fieldset><legend>Estado visual</legend><div className="character-review-buttons">{Object.keys(characterModes).map(mode => <button key={mode} type="button" aria-pressed={selected === mode} onClick={() => setSelected(mode as CharacterState)}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</button>)}</div></fieldset>
    <fieldset><legend>Tamanho do retrato</legend><div className="character-review-buttons">{[48, 64, 96, 120].map(value => <button key={value} type="button" aria-pressed={size === value} onClick={() => setSize(value)}>{value} px</button>)}</div><p>120 px permanece abaixo do canvas nativo de 135 × 133. Avalie a nitidez nesta escala.</p></fieldset>
    <fieldset><legend>Aparência</legend><label><input type="checkbox" checked={dark} onChange={event => setDark(event.target.checked)} />Escuro</label><label><input type="checkbox" checked={solid} onChange={event => setSolid(event.target.checked)} />Fundo sólido</label><label><input type="checkbox" checked={reduce} onChange={event => setReduce(event.target.checked)} />Reduzir movimento</label><label><input type="checkbox" checked={framed} onChange={event => setFramed(event.target.checked)} />Enquadrar como retrato</label></fieldset>
    <p>Desmarque o enquadramento para comparar com a composição anterior. Movimento reduzido mantém a pose estática do produto.</p>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><GikaCharacterReview /></StrictMode>);
