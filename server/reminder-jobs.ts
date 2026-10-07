import type { Transaction } from 'firebase-admin/firestore';
import { hashValue } from './hash.ts';
import { db } from './platform/firebase.ts';
import { activityReminderInstant, type ActivityInput } from '../packages/domain/src/content.ts';

type ReminderActivity = {
  kind?: unknown;
  title?: unknown;
  dueAt?: unknown;
  startsAt?: unknown;
  reminderSpecs?: unknown;
  schedule?: unknown;
  dayReminderTime?: unknown;
};

export function reminderJobsForActivity(uid: string, activityId: string, revision: number, activity: ReminderActivity, now: string) {
  const targetAt = activity.schedule
    ? activityReminderInstant(activity as Pick<ActivityInput, 'schedule' | 'dayReminderTime'>)
    : activity.dueAt ?? activity.startsAt;
  if (typeof targetAt !== 'string') return [];
  const configured = Array.isArray(activity.reminderSpecs) ? activity.reminderSpecs as { id: string; minutesBefore: number }[] : [];
  const specs = configured.some(spec => spec.minutesBefore === 0) ? configured : [{ id: 'at-time', minutesBefore: 0 }, ...configured];
  const jobs: Array<{ id: string; value: Record<string, unknown> }> = [];
  for (const spec of specs) {
    const scheduledAt = new Date(Date.parse(targetAt) - spec.minutesBefore * 60_000).toISOString();
    if (scheduledAt < now) continue;
    const jobId = hashValue(`${uid}:${activityId}:${revision}:${spec.id}`);
    const deliveryWindowEnd = new Date(Math.min(Date.parse(scheduledAt) + 3600_000, Date.parse(targetAt) + (spec.minutesBefore === 0 ? 300_000 : 0))).toISOString();
    jobs.push({ id: jobId, value: { uid, activityId, activityRevision: revision, reminderSpecId: spec.id, scheduledAt, nextAttemptAt: scheduledAt, deliveryWindowEnd, state: 'pending', attempts: 0, createdAt: now, updatedAt: now } });
  }
  return jobs;
}

export function createReminderJobs(transaction: Transaction, uid: string, activityId: string, revision: number, activity: ReminderActivity, now: string) {
  for (const job of reminderJobsForActivity(uid, activityId, revision, activity, now)) transaction.create(db.doc(`reminderJobs/${job.id}`), job.value);
}

function reminderLeadTime(minutes: number) {
  const parts = [
    { amount: Math.floor(minutes / 1440), singular: 'dia', plural: 'dias' },
    { amount: Math.floor(minutes % 1440 / 60), singular: 'hora', plural: 'horas' },
    { amount: minutes % 60, singular: 'minuto', plural: 'minutos' },
  ].filter(part => part.amount > 0).map(part => `${part.amount} ${part.amount === 1 ? part.singular : part.plural}`);
  return new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(parts);
}

export function reminderMessage(activity: ReminderActivity, reminderSpecId: string) {
  const specs = Array.isArray(activity.reminderSpecs) ? activity.reminderSpecs as { id: string; minutesBefore: number }[] : [];
  const minutesBefore = specs.find(spec => spec.id === reminderSpecId)?.minutesBefore ?? 0;
  const schedule = activity.schedule as ActivityInput['schedule'] | undefined;
  if (schedule && (schedule.type === 'task' ? !schedule.dueTime : schedule.allDay)) {
    return minutesBefore === 0
      ? (schedule.type === 'task' ? 'Você tem uma tarefa para hoje.' : 'Você tem um compromisso de dia inteiro para hoje.')
      : `Lembrete da sua atividade, ${reminderLeadTime(minutesBefore)} antes do aviso do dia.`;
  }
  if (activity.kind === 'event') {
    return minutesBefore === 0
      ? 'Seu compromisso começa agora.'
      : `Seu compromisso começa em ${reminderLeadTime(minutesBefore)}.`;
  }
  return minutesBefore === 0
    ? 'Sua tarefa está marcada para agora.'
    : `Sua tarefa está marcada para daqui a ${reminderLeadTime(minutesBefore)}.`;
}
