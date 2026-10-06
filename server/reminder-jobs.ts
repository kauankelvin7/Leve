import type { Transaction } from 'firebase-admin/firestore';
import { hashValue } from './hash.ts';
import { db } from './platform/firebase.ts';

type ReminderActivity = {
  kind?: unknown;
  title?: unknown;
  dueAt?: unknown;
  startsAt?: unknown;
  reminderSpecs?: unknown;
};

export function reminderJobsForActivity(uid: string, activityId: string, revision: number, activity: ReminderActivity, now: string) {
  const targetAt = activity.dueAt ?? activity.startsAt;
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
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = minutes / 1440;
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export function reminderMessage(activity: ReminderActivity, reminderSpecId: string) {
  const title = typeof activity.title === 'string' && activity.title.trim() ? activity.title.trim() : 'sua atividade';
  const specs = Array.isArray(activity.reminderSpecs) ? activity.reminderSpecs as { id: string; minutesBefore: number }[] : [];
  const minutesBefore = specs.find(spec => spec.id === reminderSpecId)?.minutesBefore ?? 0;
  if (activity.kind === 'event') {
    return minutesBefore === 0
      ? `“${title}” começa agora. Toque para ver os detalhes.`
      : `“${title}” começa em ${reminderLeadTime(minutesBefore)}. Já já é hora.`;
  }
  return minutesBefore === 0
    ? `Chegou a hora de “${title}”. Toque para abrir sua agenda.`
    : `Hora de “${title}” em ${reminderLeadTime(minutesBefore)}. Você ainda tem um tempinho.`;
}
