import { useEffect, useMemo, useState } from 'react';
import type { Activity, Note, ShoppingItem } from '../../../../../packages/domain/src/content';
import { Icon } from '../../components/ui/Icon';
import { buildDailyBrief } from './buildDailyBrief';
import styles from './DailyBrief.module.css';

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
  return <section className={`panel ${styles.brief}`} aria-labelledby="daily-brief-title">
    <div className={styles.heading}><span className={styles.icon}><Icon name="volume" /></span><div><h2 id="daily-brief-title">Resumo em áudio</h2><p>{total} {total === 1 ? 'item no resumo' : 'itens no resumo'}</p></div><button type="button" disabled={!supported} onClick={toggleSpeech}><Icon name={speaking ? 'stop' : 'play'} />{speaking ? 'Parar áudio' : 'Ouvir resumo'}</button></div>
    {!supported && <p className="muted">Áudio indisponível neste navegador. Você pode ler o resumo abaixo.</p>}
    <details className={styles.transcript}><summary>Ler resumo<Icon name="chevronDown" /></summary><p>{brief.visual}</p></details>
    <span className="visually-hidden" aria-live="polite">{speaking ? 'Reproduzindo o resumo do dia.' : ''}</span>
  </section>;
}
