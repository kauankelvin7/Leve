import { randomUUID } from 'node:crypto';
import { getMessaging } from 'firebase-admin/messaging';
import type { DocumentReference, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { Request } from 'express';
import { AppError } from './errors.ts';
import { db } from './platform/firebase.ts';
import { moveScheduleToDate, recurrenceDates, recurrenceDatesThrough, scheduleInstants, type ActivityInput, type RecurrenceRule } from '../packages/domain/src/content.ts';
import { hashValue } from './hash.ts';
import { createReminderJobs } from './reminder-jobs.ts';
import { validTickSignature } from './tick-signature.ts';

type ReminderDeliveryResult = {
  successCount: number;
  responses: Array<{ success: boolean; error?: { code?: string } }>;
};

type ReminderSender = (message: { tokens: string[]; data: Record<string, string> }) => Promise<ReminderDeliveryResult>;

const sendReminder: ReminderSender = message => getMessaging().sendEachForMulticast(message);

export function verifyTick(request: Request) {
  const secret = process.env.SCHEDULER_HMAC_SECRET;
  const timestamp = request.header('x-leve-timestamp') ?? '';
  const signature = request.header('x-leve-signature') ?? '';
  if (!secret || !/^\d{10,13}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) throw new AppError(401, 'AUTH_REQUIRED', 'Assinatura inválida.');
  const milliseconds = timestamp.length === 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (Math.abs(Date.now() - milliseconds) > 300_000) throw new AppError(401, 'AUTH_REQUIRED', 'Assinatura expirada.');
  if (!validTickSignature(secret, timestamp, signature)) throw new AppError(401, 'AUTH_REQUIRED', 'Assinatura inválida.');
}

async function invalidateNotificationTokens(uid: string, records: QueryDocumentSnapshot[], now: string) {
  if (!records.length) return;
  const countsRef = db.doc(`users/${uid}/internal/counts`);
  const tokenRefs = records.map(record => record.ref);
  const deviceRefs = records.map(record => db.doc(`notificationDevices/${uid}_${record.data().deviceId}`));
  await db.runTransaction(async transaction => {
    const [counts, ...snapshots] = await transaction.getAll(countsRef, ...tokenRefs, ...deviceRefs);
    const tokens = snapshots.slice(0, tokenRefs.length);
    const devices = snapshots.slice(tokenRefs.length);
    let activeDevices = 0;
    records.forEach((record, index) => {
      const rejectedToken = record.data().token;
      const currentToken = tokens[index]?.data();
      if (typeof rejectedToken !== 'string' || currentToken?.state !== 'active' || currentToken.token !== rejectedToken) return;
      transaction.update(record.ref, { state: 'invalid', token: null, updatedAt: now });
      const device = devices[index]?.data();
      if (device?.state === 'active' && device.tokenHash === hashValue(rejectedToken)) {
        activeDevices++;
        transaction.set(deviceRefs[index]!, { state: 'invalid', updatedAt: now }, { merge: true });
      }
    });
    if (activeDevices) transaction.set(countsRef, { notificationDevices: Math.max(0, Number(counts?.data()?.notificationDevices ?? activeDevices) - activeDevices) }, { merge: true });
  });
}

async function reclaimExpiredLease(ref: DocumentReference, now: string) {
  return db.runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists || current.data()?.state !== 'processing' || current.data()?.leaseUntil > now) return false;
    transaction.update(ref, { state: 'pending', leaseId: null, leaseUntil: null, nextAttemptAt: now, updatedAt: now });
    return true;
  });
}

async function updateLeasedJob(ref: DocumentReference, leaseId: string, values: Record<string, unknown>) {
  return db.runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists || current.data()?.state !== 'processing' || current.data()?.leaseId !== leaseId) return false;
    transaction.update(ref, values);
    return true;
  });
}

export async function processReminderTick(sender: ReminderSender = sendReminder) {
  const now = new Date().toISOString();
  const expiredLeases = await db.collection('reminderJobs').where('state', '==', 'processing').where('leaseUntil', '<=', now).limit(20).get();
  const reclaimed = (await Promise.all(expiredLeases.docs.map(job => reclaimExpiredLease(job.ref, now)))).filter(Boolean).length;
  const jobs = await db.collection('reminderJobs').where('state', '==', 'pending').where('nextAttemptAt', '<=', now).limit(50).get();
  let sent = 0; let skipped = 0; let retried = 0;
  for (const snapshot of jobs.docs) {
    const leaseId = randomUUID();
    const reserved = await db.runTransaction(async transaction => {
      const current = await transaction.get(snapshot.ref);
      if (!current.exists || current.data()?.state !== 'pending' || current.data()?.nextAttemptAt > now) return null;
      transaction.update(snapshot.ref, { state: 'processing', leaseId, leaseUntil: new Date(Date.now() + 120_000).toISOString(), updatedAt: now });
      return current.data();
    });
    if (!reserved) continue;
    const activity = await db.doc(`users/${reserved.uid}/activities/${reserved.activityId}`).get();
    const profile = await db.doc(`users/${reserved.uid}`).get();
    if (!activity.exists || !profile.exists || profile.data()?.accountState !== 'active' || activity.data()?.revision !== reserved.activityRevision || activity.data()?.status !== 'pending' || activity.data()?.deletedAt || reserved.deliveryWindowEnd < now) {
      if (await updateLeasedJob(snapshot.ref, leaseId, { state: reserved.deliveryWindowEnd < now ? 'expired' : 'obsolete', leaseId: null, leaseUntil: null, updatedAt: now })) skipped++;
      continue;
    }
    const tokenRecords = (await db.collection('notificationTokens').where('uid', '==', reserved.uid).where('state', '==', 'active').limit(3).get()).docs
      .filter(record => typeof record.data().token === 'string');
    const tokens = tokenRecords.map(record => record.data().token as string);
    if (!tokens.length) {
      if (await updateLeasedJob(snapshot.ref, leaseId, { state: 'no-device', leaseId: null, leaseUntil: null, updatedAt: now })) skipped++;
      continue;
    }
    try {
      const result = await sender({ tokens, data: { title: 'Leve', body: String(activity.data()?.title ?? 'Você tem uma atividade.'), url: `/atividade/${reserved.activityId}`, tag: `activity-${reserved.activityId}` } });
      const invalid = result.responses.flatMap((response, index) => !response.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(response.error?.code ?? '') ? [tokenRecords[index]!] : []);
      await invalidateNotificationTokens(reserved.uid, invalid, now);
      if (result.successCount) {
        if (await updateLeasedJob(snapshot.ref, leaseId, { state: 'sent', sentAt: now, successCount: result.successCount, leaseId: null, leaseUntil: null, updatedAt: now })) sent++;
      }
      else throw result.responses.find(response => response.error)?.error ?? new Error('FCM recusou o lote.');
    } catch (failure) {
      const code = (failure as { code?: string }).code ?? '';
      const definitelyRejected = code.startsWith('messaging/');
      if (!definitelyRejected) {
        if (await updateLeasedJob(snapshot.ref, leaseId, { state: 'unknown', failureCode: 'UNCERTAIN_DELIVERY', leaseId: null, leaseUntil: null, updatedAt: now })) skipped++;
        continue;
      }
      const attempts = (reserved.attempts ?? 0) + 1;
      const nextAttemptAt = new Date(Date.now() + Math.min(3600_000, 30_000 * 2 ** attempts)).toISOString();
      if (await updateLeasedJob(snapshot.ref, leaseId, { state: attempts >= 5 || nextAttemptAt > reserved.deliveryWindowEnd ? 'failed' : 'pending', failureCode: code, attempts, nextAttemptAt, leaseId: null, leaseUntil: null, updatedAt: now })) retried++;
    }
  }
  return { reclaimed, examined: jobs.size, sent, skipped, retried };
}

export async function materializeRecurringActivities() {
  const horizon = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
  const series = await db.collectionGroup('series').where('state', '==', 'active').where('materializedThrough', '<=', horizon).limit(10).get();
  let created = 0;
  for (const snapshot of series.docs) {
    const data = snapshot.data() as { activity: ActivityInput; recurrence: RecurrenceRule; materializedCount: number; materializedThrough: string; revision: number };
    const firstDate = data.activity.schedule.type === 'task' ? data.activity.schedule.dueDate : data.activity.schedule.startDate;
    if (!firstDate) continue;
    const candidates = recurrenceDates(firstDate, data.recurrence, 90, data.materializedCount);
    const dates = recurrenceDatesThrough(firstDate, data.recurrence, horizon, 90, data.materializedCount);
    const uid = snapshot.ref.parent.parent?.id;
    if (!uid) continue;
    const root = db.doc(`users/${uid}`);
    await db.runTransaction(async transaction => {
      const [current, profile, counts] = await transaction.getAll(snapshot.ref, root, root.collection('internal').doc('counts'));
      if (!current?.exists || current.data()?.state !== 'active' || current.data()?.materializedCount !== data.materializedCount) return;
      if (!dates.length) {
        if (!candidates.length) transaction.update(snapshot.ref, { state: 'completed', updatedAt: new Date().toISOString() });
        return;
      }
      if ((counts?.data()?.activities ?? 0) + (counts?.data()?.reserved_activities ?? 0) + dates.length > 5000) { transaction.update(snapshot.ref, { state: 'paused-limit', updatedAt: new Date().toISOString() }); return; }
      const now = new Date().toISOString();
      for (const occurrenceKey of dates) {
        const schedule = moveScheduleToDate(data.activity.schedule, occurrenceKey);
        const occurrenceId = hashValue(`${uid}:${snapshot.id}:${occurrenceKey}`).slice(0, 32);
        const occurrence = { ...data.activity, schedule, ...scheduleInstants(schedule), kind: schedule.type, status: 'pending', completedAt: null, seriesId: snapshot.id, occurrenceKey, revision: 1, schemaVersion: 1, deletedAt: null, createdAt: now, updatedAt: now };
        transaction.create(root.collection('activities').doc(occurrenceId), occurrence);
        createReminderJobs(transaction, uid, occurrenceId, 1, occurrence, now);
      }
      transaction.update(snapshot.ref, { materializedCount: data.materializedCount + dates.length, materializedThrough: dates.at(-1), updatedAt: now });
      transaction.set(root.collection('internal').doc('counts'), { activities: (counts?.data()?.activities ?? 0) + dates.length }, { merge: true });
      transaction.update(root, { dataVersion: (profile?.data()?.dataVersion ?? 0) + 1, updatedAt: now });
      created += dates.length;
    });
  }
  return { examined: series.size, created };
}

export async function purgeExpiredContent() {
  const now = new Date().toISOString();
  const groups = ['activities', 'categories', 'notes', 'shoppingLists', 'items'] as const;
  const snapshots = await Promise.all(groups.map(group => db.collectionGroup(group).where('purgeAfter', '<=', now).limit(5).get()));
  let purged = 0;
  for (const snapshot of snapshots.flatMap(result => result.docs)) {
    const parts = snapshot.ref.path.split('/');
    const uid = parts[0] === 'users' ? parts[1] : null;
    if (!uid) continue;
    const root = db.doc(`users/${uid}`);
    const marker = db.doc(`maintenanceReceipts/purge_${hashValue(snapshot.ref.path)}`);
    const parent = snapshot.ref.parent.id === 'items' ? snapshot.ref.parent.parent : null;
    const countsRef = root.collection('internal').doc('counts');
    const prepared = await db.runTransaction(async transaction => {
      const [job, target] = await transaction.getAll(marker, snapshot.ref);
      if (job?.data()?.state === 'completed') return false;
      if (job?.data()?.state === 'prepared') return true;
      if (!target?.exists || !target.data()?.deletedAt || target.data()?.purgeAfter > now) return false;
      transaction.create(marker, { state: 'prepared', uid, targetPath: snapshot.ref.path, createdAt: now });
      transaction.update(snapshot.ref, { purgingAt: now });
      return true;
    });
    if (!prepared) continue;
    await db.recursiveDelete(snapshot.ref);
    await db.runTransaction(async transaction => {
      const [job, profile, counts, parentSnapshot] = await transaction.getAll(marker, root, countsRef, ...(parent ? [parent] : []));
      if (job?.data()?.state === 'completed') return;
      transaction.set(marker, { state: 'completed', completedAt: now }, { merge: true });
      if (parent && parentSnapshot?.exists) transaction.update(parent, { itemCount: Math.max(0, (parentSnapshot.data()?.itemCount ?? 1) - 1), updatedAt: now });
      else {
        const countKey = snapshot.ref.parent.id;
        transaction.set(countsRef, { [countKey]: Math.max(0, (counts?.data()?.[countKey] ?? 1) - 1) }, { merge: true });
      }
      if (profile?.exists) transaction.update(root, { dataVersion: (profile.data()?.dataVersion ?? 0) + 1, updatedAt: now });
    });
    purged++;
  }
  return { examined: snapshots.reduce((total, snapshot) => total + snapshot.size, 0), purged };
}
