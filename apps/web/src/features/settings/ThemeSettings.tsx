import { useState } from 'react';
import { sendCommand } from '../../platform/api';
import { useAuth } from '../identity/AuthProvider';

const themes = [['green', 'Verde suave', '#BFD4C6'], ['purple', 'Roxo suave', '#D4C6E5'], ['blue', 'Azul suave', '#C2D6EA'], ['red', 'Vermelho suave', '#E7C3C6']] as const;

export function ThemeSettings() {
  const { session, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const profile = session!.profile!;
  async function choose(colorTheme: typeof themes[number][0]) {
    setBusy(true); setMessage('');
    try {
      await sendCommand({ command: 'profile.update', operationId: crypto.randomUUID(), entityId: session!.uid, expectedRevision: profile.revision, payload: { displayName: profile.displayName, locale: profile.locale, weekStartsOn: profile.weekStartsOn, reduceTransparency: profile.reduceTransparency, colorTheme } });
      await refresh(); setMessage('Cor salva.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a cor.'); }
    finally { setBusy(false); }
  }
  return <section className="panel content-form"><h2>Cor do sistema</h2><fieldset className="theme-options"><legend>Paleta</legend>{themes.map(([value, label, color]) => <label key={value}><input type="radio" name="colorTheme" checked={(profile.colorTheme ?? 'green') === value} disabled={busy} onChange={() => void choose(value)} /><span className="theme-swatch" style={{ backgroundColor: color }} aria-hidden="true" />{label}</label>)}</fieldset><p role="status">{message}</p></section>;
}
