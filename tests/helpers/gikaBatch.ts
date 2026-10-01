import type { Page } from '@playwright/test';
import { Temporal } from '@js-temporal/polyfill';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { batchPlanSchema, batchOperationId, type BatchConfirmation } from '../../packages/domain/src/gikaBatch';
import { issueBatchConfirmation } from '../../server/gika/confirmation';
import { inspectRecurrence } from '../../server/gika/recurrenceGuard';

// Test-worker read client only. All setup and tested mutations use conventional commands.
process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
if (!/^localhost:8080$|^127\.0\.0\.1:8080$/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw Error('Local emulator required.');
export const batchTestDb = getFirestore(getApps().find(app => app.name === 'gika-batch-e2e') ?? initializeApp({ projectId: 'demo-leve' }, 'gika-batch-e2e'));
export const batchTestZone = 'America/Sao_Paulo';
export const batchSourceDate = Temporal.Now.instant().toZonedDateTimeISO(batchTestZone).toPlainDate().add({ days: 12 }).toString();
export const batchDestinationDate = Temporal.PlainDate.from(batchSourceDate).add({ days: 1 }).toString();
export const batchTestPayload = (title: string, time: string | null = '10:00') => ({ title, descriptionPlain: 'Nota sintética do teste', categoryId: null, colorHex: '#65A885', estimatedMinutes: 25, reminderSpecs: [], schedule: { type: 'task', dueDate: batchSourceDate, dueTime: time, timeZone: batchTestZone, disambiguation: 'reject' } });

export async function createBatchFixture(page: Page, prefix: string, action: 'complete' | 'reschedule', recurring = false, count = 2) {
  if (!Number.isInteger(count) || count < 1 || count > 5) throw Error('Fixture batch count must be within the bounded limit.');
  const identity = await page.evaluate(async value => {
    const apiPath = '/src/platform/api.ts', authPath = '/src/platform/firebase.ts';
    const { sendCommand } = await import(/* @vite-ignore */ apiPath), { firebaseAuth } = await import(/* @vite-ignore */ authPath);
    if (!firebaseAuth.currentUser) throw Error('Authenticated test account required.');
    const tasks: { id: string; title: string; seriesId?: string }[] = [];
    const titles = [...Array.from({ length: value.count }, (_, index) => `${value.prefix} ${String.fromCharCode(65 + index)}`), `${value.prefix} preservar`];
    for (const [index, title] of titles.entries()) {
      const id = crypto.randomUUID();
      const activity = { ...value.payload, title, schedule: { ...value.payload.schedule, dueTime: index === 1 ? null : '10:00' } };
      if (value.recurring && index === 0) {
        await sendCommand({ command: 'activity.createSeries', operationId: crypto.randomUUID(), entityId: id, expectedRevision: 0, payload: { activity, recurrence: { frequency: 'daily', interval: 1, count: 3, until: null, monthlyPolicy: 'lastDay' } } });
        tasks.push({ id, title, seriesId: id });
      } else {
        await sendCommand({ command: 'activity.create', operationId: crypto.randomUUID(), entityId: id, expectedRevision: 0, payload: activity }); tasks.push({ id, title });
      }
    }
    return { uid: firebaseAuth.currentUser.uid as string, tasks };
  }, { prefix, payload: batchTestPayload(prefix), recurring, count });
  for (const task of identity.tasks) if (task.seriesId) {
    const occurrences = await batchTestDb.collection(`users/${identity.uid}/activities`).where('seriesId', '==', task.seriesId).where('occurrenceKey', '==', batchSourceDate).get();
    const target = occurrences.docs[0]; if (occurrences.size !== 1 || !target) throw Error('Expected exact recurring occurrence.'); task.id = target.id;
  }
  const selected = identity.tasks.slice(0, count).sort((a, b) => a.id.localeCompare(b.id)), excluded = identity.tasks[count];
  if (!excluded || selected.length !== count) throw Error('Batch fixture needs the exact target count and one excluded sibling.');
  const original = await Promise.all(identity.tasks.map(async task => ({ id: task.id, data: (await batchTestDb.doc(`users/${identity.uid}/activities/${task.id}`).get()).data() })));
  let modelCalls = 0, request: { requestId: string; text: string } | undefined, confirmation: BatchConfirmation | undefined;
  await page.route('**/api/gika/respond', async route => {
    modelCalls++; request = route.request().postDataJSON(); if (!request) throw Error('Expected request.');
    const items = await Promise.all(selected.map(async (task, index) => {
      const data = (await batchTestDb.doc(`users/${identity.uid}/activities/${task.id}`).get()).data();
      if (!data) throw Error('Batch target missing.');
      let recurrence;
      if (task.seriesId) {
        const series = (await batchTestDb.doc(`users/${identity.uid}/series/${task.seriesId}`).get()).data(); if (!series) throw Error('Expected recurring series.');
        recurrence = inspectRecurrence(task.seriesId, task.id, series, data); if (!recurrence) throw Error('Expected recurring snapshot.');
      }
      return { operationId: await batchOperationId(identity.uid, request!.requestId, index), id: task.id, title: task.title, revision: data.revision, timeZone: batchTestZone, before: { dueDate: batchSourceDate, dueTime: data.schedule.dueTime }, patch: action === 'complete' ? { status: 'completed' } : { dueDate: batchDestinationDate }, scope: recurrence ? 'occurrence' : 'none', ...(recurrence ? { recurrence } : {}) };
    }));
    const plan = batchPlanSchema.parse({ action, sourceDate: batchSourceDate, items });
    confirmation = await issueBatchConfirmation(identity.uid, request, plan);
    await route.fulfill({ json: { text: 'Confira as tarefas antes de confirmar.', simulated: false, reads: [], batchConfirmation: confirmation } });
  });
  return { ...identity, selected, excluded, original, action, recurring, modelCalls: () => modelCalls, request: () => { if (!request) throw Error('Expected original request.'); return request; }, confirmation: () => { if (!confirmation) throw Error('Expected sealed batch.'); return confirmation; } };
}
export async function batchReceipt(uid: string, operationId: string) { return (await batchTestDb.doc(`commandReceipts/${uid}_${operationId}`).get()).data(); }
export async function batchTask(uid: string, id: string) { return (await batchTestDb.doc(`users/${uid}/activities/${id}`).get()).data(); }
