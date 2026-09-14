import type { Transaction } from 'firebase-admin/firestore';
import { hashValue } from './hash.ts';
import { db } from './platform/firebase.ts';

type ReminderActivity = {
  dueAt?: unknown;
  startsAt?: unknown;
  reminderSpecs?: unknown;
};

export function createReminderJobs(transaction: Transaction, uid: string, activityId: string, revision: number, activity: ReminderActivity, now: string) {
  const targetAt = activity.dueAt ?? activity.startsAt;
  if (typeof targetAt !== 'string' || !Array.isArray(activity.reminderSpecs)) return;
  for (const spec of activity.reminderSpecs as { id: string; minutesBefore: number }[]) {
    const scheduledAt = new Date(Date.parse(targetAt) - spec.minutesBefore * 60_000).toISOString();
    if (scheduledAt < now) continue;
    const jobId = hashValue(`${uid}:${activityId}:${revision}:${spec.id}`);
    const deliveryWindowEnd = new Date(Math.min(Date.parse(scheduledAt) + 3600_000, Date.parse(targetAt) + (spec.minutesBefore === 0 ? 300_000 : 0))).toISOString();
    transaction.create(db.doc(`reminderJobs/${jobId}`), { uid, activityId, activityRevision: revision, reminderSpecId: spec.id, scheduledAt, nextAttemptAt: scheduledAt, deliveryWindowEnd, state: 'pending', attempts: 0, createdAt: now, updatedAt: now });
  }
}
