import type { Activity, Note, ShoppingItem } from '../../../../../packages/domain/src/content';
import { formatCivilDate, formatCivilDateLong } from '../../platform/formatters';

type StoredActivity = Activity & { id: string };
type StoredNote = Note & { id: string };
type StoredShoppingItem = ShoppingItem & { id: string; parentId: string };

function spokenTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
  if (minutes === 0) return `às ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  return `às ${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} minutos`;
}

function activitySentence(activity: StoredActivity) {
  const schedule = activity.schedule;
  const time = schedule.type === 'task'
    ? schedule.dueTime ? spokenTime(schedule.dueTime) : ''
    : schedule.allDay ? 'durante o dia' : spokenTime(schedule.startTime);
  const estimate = activity.estimatedMinutes
    ? `por cerca de ${activity.estimatedMinutes} ${activity.estimatedMinutes === 1 ? 'minuto' : 'minutos'}`
    : '';
  const detail = activity.descriptionPlain.trim();
  return [activity.title, estimate, time, detail].filter(Boolean).join(', ') + '.';
}

function shortText(value: string, maximum = 180) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maximum ? `${normalized.slice(0, maximum - 1).trimEnd()}…` : normalized;
}

export function buildDailyBrief(input: {
  selectedDay: string;
  today: string;
  activities: StoredActivity[];
  notes: StoredNote[];
  shoppingItems: StoredShoppingItem[];
}) {
  const pending = input.activities.filter(item => !item.deletedAt && item.status === 'pending');
  const completed = input.activities.filter(item => !item.deletedAt && item.status === 'completed');
  const dayNotes = input.notes.filter(note => !note.deletedAt && (note.linkedDate === input.selectedDay || note.pinned));
  const uniqueNotes = [...new Map(dayNotes.map(note => [note.id, note])).values()];
  const shopping = input.shoppingItems.filter(item => !item.deletedAt && !item.checked);
  const isToday = input.selectedDay === input.today;
  const visualDate = formatCivilDate(input.selectedDay);
  const spokenDate = formatCivilDateLong(input.selectedDay);

  const visual: string[] = [];
  const spoken: string[] = [];
  const opening = `${isToday ? 'Hoje' : 'No dia'} ${visualDate}`;
  const spokenOpening = `${isToday ? 'Hoje' : 'No dia'} ${spokenDate}`;

  if (!pending.length && !uniqueNotes.length && !shopping.length) {
    visual.push(`${opening}, não há nada pendente.`);
    spoken.push(`${spokenOpening}, não há nada pendente.`);
  } else {
    visual.push(`${opening}, ${pending.length ? `você tem ${pending.length} ${pending.length === 1 ? 'atividade pendente' : 'atividades pendentes'}` : 'não há atividades pendentes'}.`);
    spoken.push(`${spokenOpening}, ${pending.length ? `você tem ${pending.length} ${pending.length === 1 ? 'atividade pendente' : 'atividades pendentes'}` : 'não há atividades pendentes'}.`);
    pending.forEach(activity => {
      const sentence = activitySentence(activity);
      visual.push(sentence);
      spoken.push(sentence);
    });
    if (uniqueNotes.length) {
      const noteText = uniqueNotes.slice(0, 3).map(note => `${note.title}: ${shortText(note.plainText || 'sem texto')}`).join('. ');
      visual.push(`${uniqueNotes.length === 1 ? 'Anotação' : 'Anotações'}: ${noteText}.`);
      spoken.push(`${uniqueNotes.length === 1 ? 'Você também anotou' : 'Você também tem estas anotações'}: ${noteText}.`);
    }
    if (shopping.length) {
      const names = shopping.slice(0, 5).map(item => item.name).join(', ');
      const remaining = shopping.length - Math.min(5, shopping.length);
      const shoppingText = `Nas compras, faltam ${names}${remaining ? ` e mais ${remaining} ${remaining === 1 ? 'item' : 'itens'}` : ''}.`;
      visual.push(shoppingText);
      spoken.push(shoppingText);
    }
  }

  if (completed.length) {
    const done = `Você já concluiu ${completed.length} ${completed.length === 1 ? 'atividade' : 'atividades'} neste dia.`;
    visual.push(done);
    spoken.push(done);
  }

  return {
    visual: visual.join(' '),
    spoken: spoken.join(' '),
    counts: { pending: pending.length, notes: uniqueNotes.length, shopping: shopping.length, completed: completed.length },
  };
}
