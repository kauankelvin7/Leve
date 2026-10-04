import { useState } from 'react';
import { GikaMark } from './GikaMark';
import { daySuggestion } from './proactivity';
import { requestDayOrganization } from './GikaLauncher';

export function GikaSuggestion({ uid, ...facts }: Parameters<typeof daySuggestion>[0] & { uid: string }) {
  const suggestion = daySuggestion(facts);
  // Memory only for this mounted Today context; bounded to the last eight dismissals.
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [offlineHint, setOfflineHint] = useState<string | null>(null);
  if (!suggestion || dismissed.includes(suggestion.fingerprint)) return null;
  function dismiss() { setDismissed(current => [...current.slice(-7), suggestion!.fingerprint]); }
  return <section className="panel daily-brief" aria-labelledby="gika-day-suggestion-title">
    <div className="daily-brief-heading"><span className="daily-brief-icon"><GikaMark /></span><div><p className="eyebrow">Gika</p><h2 id="gika-day-suggestion-title">Quer organizar o dia?</h2></div></div>
    <p className="daily-brief-text">Você tem {suggestion.count} tarefas pendentes para hoje. Posso ajudar a preparar uma sugestão.</p>
    <div className="daily-brief-actions">
      <button type="button" className="primary" onClick={() => { if (!navigator.onLine) { setOfflineHint(suggestion.fingerprint); return; } requestDayOrganization(uid); dismiss(); }}>Pedir sugestão</button>
      <button type="button" className="text-button" onClick={() => { dismiss(); document.getElementById('page-title')?.focus({ preventScroll: true }); }}>Agora não</button>
    </div>
    {offlineHint === suggestion.fingerprint && <p className="muted" role="status">A Gika precisa de conexão para preparar uma sugestão. Conecte-se e toque em Pedir sugestão.</p>}
  </section>;
}
