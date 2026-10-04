import type { Activity } from '../../../../../packages/domain/src/content';
import { GIKA_BATCH_LIMIT } from '../../../../../packages/domain/src/gikaBatch';

type Fact = Pick<Activity, 'kind' | 'status' | 'schedule' | 'deletedAt'> & { id: string };

// Today already owns at most three limit50 queries. No history, title, note or new read.
export function daySuggestion(input: { today: string; selectedDay: string; activities: readonly Fact[]; loading: boolean; error: string; partial: boolean }) {
  if (input.loading || input.error || input.partial || input.selectedDay !== input.today || input.activities.length > 150) return null;
  const tasks = input.activities.filter(item => item.kind === 'task' && item.status === 'pending' && !item.deletedAt && item.schedule.type === 'task' && item.schedule.dueDate === input.today);
  if (tasks.length < 4 || tasks.length > GIKA_BATCH_LIMIT) return null;
  const fingerprint = JSON.stringify([input.today, tasks.map(item => [item.id, item.schedule.type === 'task' ? item.schedule.dueTime ?? null : null]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))]);
  return { count: tasks.length, fingerprint };
}
