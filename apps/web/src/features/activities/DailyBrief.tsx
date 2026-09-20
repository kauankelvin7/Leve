import { useEffect, useMemo, useState } from 'react';
import type { Activity, Note, ShoppingItem } from '../../../../../packages/domain/src/content';
import { Icon } from '../../components/ui/Icon';
import { buildDailyBrief } from './buildDailyBrief';

type StoredActivity = Activity & { id: string };
type StoredNote = Note & { id: string };
type StoredShoppingItem = ShoppingItem & { id: string; parentId: string };

export function DailyBrief({ selectedDay, today, activities, notes, shoppingItems }: {
  selectedDay: string;
  today: string;
  activities: StoredActivity[];
  notes: StoredNote[];
  shoppingItems: StoredShoppingItem[];
}) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const brief = useMemo(() => buildDailyBrief({ selectedDay, today, activities, notes, shoppingItems }), [selectedDay, today, activities, notes, shoppingItems]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [selectedDay, supported]);

  function toggleSpeech() {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(brief.spoken);
    utterance.lang = 'pt-BR';
    utterance.rate = .96;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang.toLocaleLowerCase() === 'pt-br')
      ?? voices.find(voice => voice.lang.toLocaleLowerCase().startsWith('pt'))
      ?? null;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  const total = brief.counts.pending + brief.counts.notes + brief.counts.shopping;
  return <section className="panel daily-brief" aria-labelledby="daily-brief-title">
    <div className="daily-brief-heading"><span className="daily-brief-icon"><Icon name="volume" /></span><div><p className="eyebrow">Resumo do dia</p><h2 id="daily-brief-title">Ouça sua agenda</h2></div><span className="count-badge">{total} {total === 1 ? 'ponto' : 'pontos'}</span></div>
    <p className="daily-brief-text">{brief.visual}</p>
    <div className="daily-brief-actions"><button type="button" className="primary" disabled={!supported} onClick={toggleSpeech}><Icon name={speaking ? 'stop' : 'volume'} />{speaking ? 'Parar áudio' : 'Ouvir resumo'}</button>{!supported ? <small>Áudio indisponível.</small> : <small>Voz do aparelho.</small>}</div>
    <span className="visually-hidden" aria-live="polite">{speaking ? 'Reproduzindo o resumo do dia.' : ''}</span>
  </section>;
}
