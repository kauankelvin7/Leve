import { commandHash } from '../commands/identity.ts';
import { batchOperationId, batchCommandFields, batchConfirmationSchema, batchResult, type BatchConfirmation, type BatchResult } from '../../packages/domain/src/gikaBatch.ts';
import { recurrenceConfirmationSchema, recurrenceCommandFields, type RecurrenceConfirmation, type RecurrenceSnapshot, type RecurrenceTask } from '../../packages/domain/src/gikaRecurrence.ts';
import { inspectRecurrence } from './recurrenceGuard.ts';
import { hashCanonicalValue } from '../hash.ts';
import { gikaConfirmationSchema, type GikaConfirmation } from '../../packages/domain/src/gikaConfirmation.ts';
import { rescheduleDescriptorSchema,type RescheduleDescriptor } from '../../packages/domain/src/gikaReschedule.ts';
import { updateDescriptorSchema, type UpdateDescriptor } from '../../packages/domain/src/gikaUpdate.ts';
import { completionDescriptorSchema, completionResultSchema, type CompletionDescriptor } from '../../packages/domain/src/gikaCompletion.ts';
import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { activityInputSchema, shoppingListInputSchema } from '../../packages/domain/src/content.ts';
import { entityIdSchema, timeZoneSchema } from '../../packages/domain/src/identity.ts';
import { commandCreationResultSchema, createTaskDescriptorSchema, readItemSchema, readResultSchema, type CreateTaskDescriptor, type GikaRequest, type ReadResult } from '../../packages/domain/src/gika.ts';
import { db } from '../platform/firebase.ts';
import { AppError } from '../errors.ts';
import { GikaFault, type ModelContext } from './model.ts';
import { hashValue } from '../hash.ts';
import { createShoppingListDescriptorSchema, shoppingListCommandFields, shoppingListReadItemSchema, shoppingListsResultSchema, type CreateShoppingListDescriptor, type ShoppingListsResult } from '../../packages/domain/src/gikaShopping.ts';

export type ReadRange = { startDate: string; endDate: string; timeZone: string };
export interface ReadRepository {
  authorize(identity: DecodedIdToken, purpose?: 'receipt'): Promise<ModelContext>;
  read(uid: string, range: ReadRange): Promise<ReadResult>;
  readShoppingLists?(uid: string): Promise<ShoppingListsResult>;
  inspectRecurrence?(uid: string, task: RecurrenceTask): Promise<RecurrenceSnapshot | null>;
  recoverBatch?(uid:string, request:GikaRequest):Promise<{confirmation:BatchConfirmation;result:BatchResult}|null>;
  recoverMutation(uid: string, request: GikaRequest): Promise<{ kind: 'shopping_create'; list: CreateShoppingListDescriptor } | { kind: 'create'; task: CreateTaskDescriptor } | { kind: 'complete'; task: CompletionDescriptor } | { kind: 'update'; task: UpdateDescriptor } | { kind: 'reschedule'; task: RescheduleDescriptor; confirmation?: GikaConfirmation } | { kind: 'recurrence'; confirmation: RecurrenceConfirmation } | null>;
}
const trustedProfileSchema = z.object({ uid: entityIdSchema, accountState: z.literal('active'), timeZone: timeZoneSchema, weekStartsOn: z.union([z.literal(0), z.literal(1)]) });
export const firestoreReads: ReadRepository = {
  async recoverBatch(uid, request) {
    entityIdSchema.parse(uid);
    const ids = await Promise.all(Array.from({length:5},(_,index)=>batchOperationId(uid,request.requestId,index)));
    const docs = await db.getAll(...ids.map(id=>db.doc(`commandReceipts/${uid}_${id}`)));
    const committed = docs.filter(document=>document.exists);
    if (!committed.length) return null;
    let confirmation:BatchConfirmation|undefined;
    for (const document of committed) {
      const data=document.data()!,meta=data.gikaBatch;
      if(data.uid!==uid||!meta||meta.requestId!==request.requestId||meta.requestTextHash!==hashValue(request.text)) throw new AppError(409,'OPERATION_MISMATCH','Este pedido já foi usado com outros dados. Envie um novo pedido.');
      const parsed=batchConfirmationSchema.safeParse(meta.confirmation);
      if(!parsed.success||meta.confirmationToken!==parsed.data.token||!Number.isInteger(meta.index)||meta.index<0||meta.index>=parsed.data.plan.items.length) throw new GikaFault('GIKA_INVALID_RESPONSE');
      if(confirmation&&hashCanonicalValue(confirmation)!==hashCanonicalValue(parsed.data))throw new GikaFault('GIKA_INVALID_RESPONSE');
      confirmation=parsed.data;
      const item=confirmation.plan.items[meta.index]!,ack=completionResultSchema.safeParse(data.response);
      const canonical={...batchCommandFields(confirmation.plan,meta.index),gikaBatch:{requestId:request.requestId,requestTextHash:meta.requestTextHash,index:meta.index,confirmationToken:confirmation.token}};
      if(data.hash!==commandHash(canonical))throw new GikaFault('GIKA_INVALID_RESPONSE');
      if(item.operationId!==ids[meta.index]||document.id!==`${uid}_${item.operationId}`||!ack.success||ack.data.operationId!==item.operationId||ack.data.entityId!==item.id||ack.data.revision!==item.revision+1)throw new GikaFault('GIKA_INVALID_RESPONSE');
    }
    const plan=confirmation!.plan;
    if(plan.items.some((item,index)=>item.operationId!==ids[index])||committed.length>plan.items.length)throw new GikaFault('GIKA_INVALID_RESPONSE');
    return {confirmation:confirmation!,result:batchResult(plan.items.map((item,index)=>({id:item.id,title:item.title,status:docs[index]!.exists?'alreadyApplied':'pending',...(docs[index]!.exists?{revision:item.revision+1}:{})})))};
  },
  async inspectRecurrence(uid, task) {
    const root = db.collection(`users/${entityIdSchema.parse(uid)}/activities`);
    const target = await root.doc(entityIdSchema.parse(task.id)).get();
    const data = target.data();
    if (!data || !entityIdSchema.safeParse(data.seriesId).success || !data.occurrenceKey || data.deletedAt || data.revision !== task.revision || data.title !== task.title || data.schedule?.type !== 'task' || data.schedule?.dueDate !== task.dueDate || data.schedule?.dueTime !== task.dueTime || data.schedule?.timeZone !== task.timeZone) return null;
    const [series, future] = await Promise.all([
      db.doc(`users/${uid}/series/${data.seriesId}`).get(),
      root.where('seriesId', '==', data.seriesId).where('occurrenceKey', '>=', data.occurrenceKey).limit(51).get(),
    ]);
    if (!series.exists) return null;
    return inspectRecurrence(data.seriesId, task.id, series.data()!, data, future.docs.map(document => ({ id: document.id, data: document.data() })));
  },
  async recoverMutation(uid, request) {
    const receipt = await db.doc(`commandReceipts/${entityIdSchema.parse(uid)}_${request.requestId}`).get();
    if (!receipt.exists) return null;
    const data = receipt.data()!;
    const metadata = data.gikaShopping ?? data.gikaRecurrence ?? data.gikaReschedule ?? data.gikaUpdate ?? data.gikaCompletion ?? data.gika;
    if (data.uid !== uid || !metadata || metadata.requestTextHash !== hashValue(request.text)) throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outros dados. Envie um novo pedido.');
    if (data.gikaShopping) {
      const meta = z.object({ requestTextHash: z.string().regex(/^[a-f0-9]{64}$/), list: createShoppingListDescriptorSchema }).strict().safeParse(data.gikaShopping);
      const response = commandCreationResultSchema.safeParse(data.response);
      if (!meta.success || !response.success || response.data.operationId !== request.requestId || response.data.entityId !== request.requestId
        || [data.gika, data.gikaUndo, data.gikaCompletion, data.gikaUpdate, data.gikaReschedule, data.gikaRecurrence, data.gikaBatch].some(value => value !== undefined)) throw new GikaFault('GIKA_INVALID_RESPONSE');
      if (data.hash !== commandHash(shoppingListCommandFields(meta.data.list, request.requestId, meta.data.requestTextHash))) throw new GikaFault('GIKA_INVALID_RESPONSE');
      return { kind: 'shopping_create', list: meta.data.list };
    }
    if (data.gikaRecurrence) {
      const confirmation = recurrenceConfirmationSchema.parse(data.gikaRecurrence.confirmation);
      const effect = confirmation.effect;
      const response = completionResultSchema.safeParse(data.response);
      if (!response.success || response.data.operationId !== request.requestId || response.data.entityId !== (effect.scope === 'future' ? effect.newSeriesId : effect.task.id) || response.data.revision !== (effect.scope === 'future' ? 1 : effect.task.revision + 1) || confirmation.token !== data.gikaRecurrence.confirmationToken || hashCanonicalValue(effect) !== hashCanonicalValue(data.gikaRecurrence.effect)) throw new GikaFault('GIKA_INVALID_RESPONSE');
      const fields = recurrenceCommandFields(effect);
      if (data.response.entityId === undefined || fields.entityId !== effect.task.id) throw new GikaFault('GIKA_INVALID_RESPONSE');
      return { kind: 'recurrence', confirmation };
    }
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
    if (purpose !== 'receipt' && controls?.data()?.mode !== 'normal') throw new GikaFault('GIKA_UNAVAILABLE',
      !controls?.exists ? 'ServiceControlsMissing' : controls.data()?.mode === 'restricted' ? 'ServiceControlsRestricted' : 'ServiceControlsInvalid');
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
      const { title, descriptionPlain, categoryId, colorHex, estimatedMinutes, schedule, reminderSpecs, dayReminderTime } = data;
      const activity = activityInputSchema.safeParse({ title, descriptionPlain, categoryId, colorHex, estimatedMinutes, schedule, reminderSpecs, ...(dayReminderTime ? { dayReminderTime } : {}) });
      const item = readItemSchema.safeParse({ id: document.id, revision: data.revision, title, kind: data.kind, status: data.status, schedule, seriesId: data.seriesId, occurrenceKey: data.occurrenceKey });
      if (!activity.success || !item.success || data.schemaVersion !== 1 || data.deletedAt !== null) { partial = true; continue; }
      items.set(document.id, item.data);
    }
    if (items.size > 50) partial = true;
    const sorted = [...items.values()].sort((a, b) => a.id.localeCompare(b.id));
    return readResultSchema.parse({ ...range, partial, cached: false, items: sorted.slice(0, 50) });
  },
  async readShoppingLists(uid) {
    const snapshot = await db.collection(`users/${entityIdSchema.parse(uid)}/shoppingLists`).limit(50).get();
    let partial = snapshot.size >= 50;
    const items: ShoppingListsResult['items'] = [];
    for (const document of snapshot.docs) {
      const data = document.data();
      if (data.deletedAt || data.archivedAt) continue;
      const input = shoppingListInputSchema.safeParse({ title: data.title, listKind: data.listKind, cycleKey: data.cycleKey });
      const item = shoppingListReadItemSchema.safeParse({ id: document.id, title: data.title, listKind: data.listKind, revision: data.revision, itemCount: data.itemCount, pendingItemCount: data.pendingItemCount });
      if (!input.success || !item.success || !entityIdSchema.nullable().safeParse(data.sourceTemplateId).success || data.schemaVersion !== 1 || data.deletedAt !== null || data.archivedAt !== null) { partial = true; continue; }
      items.push(item.data);
    }
    return shoppingListsResultSchema.parse({ items: items.sort((a, b) => a.id.localeCompare(b.id)), partial, cached: false });
  },
};
