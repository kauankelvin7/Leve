import { gikaConfirmationSchema, type GikaConfirmation } from '../../packages/domain/src/gikaConfirmation.ts';
import { rescheduleDescriptorSchema,type RescheduleDescriptor } from '../../packages/domain/src/gikaReschedule.ts';
import { updateDescriptorSchema, type UpdateDescriptor } from '../../packages/domain/src/gikaUpdate.ts';
import { completionDescriptorSchema, completionResultSchema, type CompletionDescriptor } from '../../packages/domain/src/gikaCompletion.ts';
import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { activityInputSchema } from '../../packages/domain/src/content.ts';
import { entityIdSchema, timeZoneSchema } from '../../packages/domain/src/identity.ts';
import { commandCreationResultSchema, createTaskDescriptorSchema, readItemSchema, readResultSchema, type CreateTaskDescriptor, type GikaRequest, type ReadResult } from '../../packages/domain/src/gika.ts';
import { db } from '../platform/firebase.ts';
import { AppError } from '../errors.ts';
import { GikaFault, type ModelContext } from './model.ts';
import { hashValue } from '../hash.ts';

export type ReadRange = { startDate: string; endDate: string; timeZone: string };
export interface ReadRepository {
  authorize(identity: DecodedIdToken, purpose?: 'receipt'): Promise<ModelContext>;
  read(uid: string, range: ReadRange): Promise<ReadResult>;
  recoverMutation(uid: string, request: GikaRequest): Promise<{ kind: 'create'; task: CreateTaskDescriptor } | { kind: 'complete'; task: CompletionDescriptor } | { kind: 'update'; task: UpdateDescriptor } | { kind: 'reschedule'; task: RescheduleDescriptor; confirmation?: GikaConfirmation } | null>;
}
const trustedProfileSchema = z.object({ uid: entityIdSchema, accountState: z.literal('active'), timeZone: timeZoneSchema, weekStartsOn: z.union([z.literal(0), z.literal(1)]) });
export const firestoreReads: ReadRepository = {
  async recoverMutation(uid, request) {
    const receipt = await db.doc(`commandReceipts/${entityIdSchema.parse(uid)}_${request.requestId}`).get();
    if (!receipt.exists) return null;
    const data = receipt.data()!;
    const metadata = data.gikaReschedule ?? data.gikaUpdate ?? data.gikaCompletion ?? data.gika;
    if (data.uid !== uid || !metadata || metadata.requestTextHash !== hashValue(request.text)) throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outros dados. Envie um novo pedido.');
    if (data.gikaReschedule) {
      const response = completionResultSchema.safeParse(data.response);
      const task = rescheduleDescriptorSchema.safeParse(data.gikaReschedule.task);
      if (!response.success || !task.success || response.data.operationId !== request.requestId || response.data.entityId !== task.data.id || response.data.revision !== task.data.revision + 1) throw new GikaFault('GIKA_INVALID_RESPONSE');
      const confirmation = data.gikaReschedule.confirmation ? gikaConfirmationSchema.parse(data.gikaReschedule.confirmation) : undefined;
      if (confirmation && (confirmation.token !== data.gikaReschedule.confirmationToken || hashValue(JSON.stringify(confirmation.action.task)) !== hashValue(JSON.stringify(task.data)))) throw new GikaFault('GIKA_INVALID_RESPONSE');
      return { kind: 'reschedule', task: task.data, ...(confirmation ? { confirmation } : {}) };
    }
    if (data.gikaUpdate) {
      const response = completionResultSchema.safeParse(data.response);
      const task = updateDescriptorSchema.safeParse(data.gikaUpdate.task);
      if (!response.success || !task.success || response.data.operationId !== request.requestId || response.data.entityId !== task.data.id || response.data.revision !== task.data.revision + 1) throw new GikaFault('GIKA_INVALID_RESPONSE');
      return { kind: 'update', task: task.data };
    }
    if (data.gikaCompletion) {
      const response = completionResultSchema.safeParse(data.response);
      const task = completionDescriptorSchema.safeParse(data.gikaCompletion.task);
      if (!response.success || !task.success || response.data.operationId !== request.requestId || response.data.entityId !== task.data.id || response.data.revision !== task.data.revision + 1) throw new GikaFault('GIKA_INVALID_RESPONSE');
      return { kind: 'complete', task: task.data };
    }
    const response = commandCreationResultSchema.safeParse(data.response);
    const task = createTaskDescriptorSchema.safeParse(data.gika.task);
    if (!response.success || !task.success || response.data.operationId !== request.requestId || response.data.entityId !== request.requestId) throw new GikaFault('GIKA_INVALID_RESPONSE');
    return { kind: 'create', task: task.data };
  },
  async authorize(identity, purpose) {
    if (!identity.email_verified) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Confirme seu e-mail para continuar.');
    const uid = entityIdSchema.parse(identity.uid);
    const [profile, member, controls] = await db.getAll(db.doc(`users/${uid}`), db.doc(`memberships/${uid}`), db.doc('serviceControls/global'));
    const parsed = trustedProfileSchema.safeParse(profile?.data());
    if (member?.data()?.state !== 'active' || !parsed.success || parsed.data.uid !== uid) throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    // Completed receipts are reconcilable while new writes/provider calls are restricted,
    // just like contentCommand's existing receipt branch. Account permissions still apply.
    if (purpose !== 'receipt' && controls?.data()?.mode !== 'normal') throw new GikaFault('GIKA_UNAVAILABLE');
    return { today: Temporal.Now.instant().toZonedDateTimeISO(parsed.data.timeZone).toPlainDate().toString(), timeZone: parsed.data.timeZone, weekStartsOn: parsed.data.weekStartsOn };
  },
  async read(uid, range) {
    // Same query semantics as useCalendarRange; Admin reads enforce the cap explicitly.
    const root = db.collection(`users/${entityIdSchema.parse(uid)}/activities`);
    const [tasks, timed, allDay, series] = await Promise.all([
      root.where('schedule.dueDate', '>=', range.startDate).where('schedule.dueDate', '<=', range.endDate).limit(50).get(),
      root.where('schedule.startDate', '<=', range.endDate).where('schedule.endDate', '>=', range.startDate).limit(50).get(),
      root.where('schedule.startDate', '<=', range.endDate).where('schedule.endDateExclusive', '>', range.startDate).limit(50).get(),
      db.collection(`users/${uid}/series`).where('state', '==', 'active').limit(50).get(),
    ]);
    const groups = [tasks, timed, allDay];
    let partial = groups.some(group => group.size >= 50) || series.size >= 50
      || series.docs.some(document => !document.data().deletedAt && (typeof document.data().materializedThrough !== 'string' || document.data().materializedThrough < range.endDate));
    const items = new Map<string, ReadResult['items'][number]>();
    for (const group of groups) for (const document of group.docs) {
      const data = document.data();
      if (data.deletedAt) continue;
      const { title, descriptionPlain, categoryId, colorHex, estimatedMinutes, schedule, reminderSpecs } = data;
      const activity = activityInputSchema.safeParse({ title, descriptionPlain, categoryId, colorHex, estimatedMinutes, schedule, reminderSpecs });
      const item = readItemSchema.safeParse({ id: document.id, revision: data.revision, title, kind: data.kind, status: data.status, schedule, seriesId: data.seriesId, occurrenceKey: data.occurrenceKey });
      if (!activity.success || !item.success || data.schemaVersion !== 1 || data.deletedAt !== null) { partial = true; continue; }
      items.set(document.id, item.data);
    }
    if (items.size > 50) partial = true;
    const sorted = [...items.values()].sort((a, b) => a.id.localeCompare(b.id));
    return readResultSchema.parse({ ...range, partial, cached: false, items: sorted.slice(0, 50) });
  },
};
