import { useState } from 'react';
import { sendCommand } from '../../platform/api';
import { useAuth } from '../identity/AuthProvider';
import { applyAppearance, applyColorTheme, colorThemes, colorThemeIds, storedAppearance, type Appearance, type ColorTheme } from '../../platform/theme';
const appearanceLabels: Record<Appearance, string> = { light: 'Claro', dark: 'Escuro', system: 'Sistema' };
export function ThemeSettings() {
  const { session, refresh } = useAuth(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const profile = session!.profile!;
  async function choose(change: { colorTheme?: ColorTheme; appearance?: Appearance }) {
    const previous = { colorTheme: profile.colorTheme ?? 'green', appearance: profile.appearance ?? storedAppearance() }; const next = { ...previous, ...change };
    if (change.colorTheme) applyColorTheme(change.colorTheme); if (change.appearance) applyAppearance(change.appearance); setBusy(true); setMessage('');
    try { await sendCommand({ command: 'profile.update', operationId: crypto.randomUUID(), entityId: session!.uid, expectedRevision: profile.revision, payload: { displayName: profile.displayName, locale: profile.locale, weekStartsOn: profile.weekStartsOn, reduceTransparency: profile.reduceTransparency, colorTheme: next.colorTheme, appearance: next.appearance } }); await refresh(); setMessage('Aparência salva.'); }
    catch (error) { applyColorTheme(previous.colorTheme); applyAppearance(previous.appearance); setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a aparência.'); } finally { setBusy(false); }
  }
  const appearance = (profile.appearance ?? storedAppearance());
  return <section className="panel content-form"><h2>Aparência e cores</h2><p>Escolha a luminosidade e a paleta. As cores das suas notas e categorias continuam independentes.</p><fieldset className="theme-options"><legend>Aparência</legend>{(Object.keys(appearanceLabels) as Appearance[]).map(value => <label key={value}><input type="radio" name="appearance" checked={appearance === value} disabled={busy} onChange={() => void choose({ appearance: value })} />{appearanceLabels[value]}</label>)}</fieldset><fieldset className="theme-options"><legend>Paleta</legend>{colorThemeIds.map(value => <label key={value}><input type="radio" name="colorTheme" checked={(profile.colorTheme ?? 'green') === value} disabled={busy} onChange={() => void choose({ colorTheme: value })} /><span className="theme-swatch" style={{ backgroundColor: colorThemes[value].accent }} aria-hidden="true" />{colorThemes[value].label}</label>)}</fieldset><p role="status">{message}</p></section>;
}
