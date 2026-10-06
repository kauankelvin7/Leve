import { assertBatchPending } from '../gika/batchGuard.ts';
import { verifyConfirmation, verifyRecurrenceConfirmation, verifyBatchConfirmation } from '../gika/confirmation.ts';
import { recurrenceEffectSchema, recurrenceConfirmationSchema, GIKA_RECURRENCE_FUTURE_LIMIT, type RecurrenceEffect } from '../../packages/domain/src/gikaRecurrence.ts';
import { applyRecurrencePatch, assertRecurrenceSnapshot, type RecurrenceMember } from '../gika/recurrenceGuard.ts';
import { rescheduleTaskPatchSchema,rescheduleDescriptorSchema,applyReschedulePatch,type RescheduleDescriptor } from '../../packages/domain/src/gikaReschedule.ts';
import { updateTaskPatchSchema, updateDescriptorSchema, applyTitlePatch, type UpdateDescriptor } from '../../packages/domain/src/gikaUpdate.ts';
import { completionDescriptorSchema, type CompletionDescriptor } from '../../packages/domain/src/gikaCompletion.ts';
import { z } from 'zod';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DocumentReference } from 'firebase-admin/firestore';
import { activityInputSchema, categoryInputSchema, moveScheduleToDate, noteInputSchema, notePlainText, pendingShoppingItemDelta, recurrenceDates, recurrenceDatesThrough, recurringActivityInputSchema, recurringFutureUpdateSchema, scheduleInstants, shoppingCycleInputSchema, shoppingItemInputSchema, shoppingListInputSchema } from '../../packages/domain/src/content.ts';
import { entityIdSchema, type CommandEnvelope, type CommandResult } from '../../packages/domain/src/identity.ts';
import { db } from '../platform/firebase.ts';
import { AppError } from '../errors.ts';
import { commandHash } from './identity.ts';
import { hashValue } from '../hash.ts';
import { createReminderJobs } from '../reminder-jobs.ts';
import { commandCreationResultSchema, createTaskDescriptorSchema, taskActivityInput, type CreateTaskDescriptor } from '../../packages/domain/src/gika.ts';

import { creationUndoEnvelope } from '../../packages/domain/src/gikaUndo.ts';
import { createShoppingListDescriptorSchema, shoppingListCommandFields, type CreateShoppingListDescriptor } from '../../packages/domain/src/gikaShopping.ts';

const names: Record<string, string> = { activity: 'activities', category: 'categories', note: 'notes', shoppingList: 'shoppingLists', shoppingItem: 'items', series: 'series' };
const limits: Record<string, number> = { activities: 5000, categories: 50, notes: 500, shoppingLists: 50, items: 200, series: 1000 };
const emptySchema = z.object({}).strict();
const itemLocatorSchema = z.object({ listId: entityIdSchema }).strict();
function recurrenceReceipt(command: CommandEnvelope, effect: RecurrenceEffect) {
  return { ...command.gikaRecurrence!, effect, confirmation: recurrenceConfirmationSchema.parse({ effect, policy: { kind: 'confirm', risk: effect.scope === 'future' ? 'high' : 'medium', reason: 'RECURRENCE_PREVIEW_REQUIRED' }, token: command.gikaRecurrence!.confirmationToken }) };
}
const allowed: Record<string, string[]> = {
  activity: ['create', 'createSeries', 'update', 'updateFuture', 'setStatus', 'trash', 'trashSeries', 'restore', 'purge'],
  category: ['create', 'update', 'archive', 'trash', 'restore', 'purge'],
  note: ['save', 'trash', 'restore', 'purge'],
  shoppingList: ['create', 'update', 'archive', 'trash', 'restore', 'purge', 'createCycle'],
  shoppingItem: ['create', 'update', 'setChecked', 'trash', 'restore', 'purge'],
  series: ['purge'],
};

export async function contentCommand(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  if (!identity.email_verified) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Confirme seu e-mail para continuar.');
  if (command.gikaBatch && !['activity.update', 'activity.setStatus'].includes(command.command)) throw new AppError(422, 'GIKA_POLICY', 'Essa alteração não está disponível.');
  if (command.gikaRecurrence && !['activity.update', 'activity.setStatus', 'activity.updateFuture'].includes(command.command)) throw new AppError(422, 'GIKA_POLICY', 'Essa alteração não está disponível.');
  const [type = '', action = ''] = command.command.split('.');
  const collection = names[type];
  if (!collection || !allowed[type]?.includes(action)) throw new AppError(422, 'VALIDATION_ERROR', 'Comando desconhecido.');
  if (type === 'activity' && action === 'createSeries') return createActivitySeries(identity, command);
  if (type === 'activity' && action === 'trashSeries') return trashActivitySeries(identity, command);
  if (type === 'activity' && action === 'updateFuture') return updateFutureActivities(identity, command);
  if (type === 'shoppingList' && action === 'createCycle') return createShoppingCycle(identity, command);
  if (action === 'purge') return purgeContent(identity, command, type, collection);
  const writingContent = ['create', 'update', 'save'].includes(action);
  let validatedInput: Record<string, unknown>;
  if (command.gikaBatch) validatedInput = z.union([rescheduleTaskPatchSchema, z.object({ status: z.literal('completed') }).strict()]).parse(command.payload);
  else if (command.gikaRecurrence) validatedInput = z.union([updateTaskPatchSchema, rescheduleTaskPatchSchema, z.object({ status: z.literal('completed') }).strict()]).parse(command.payload);
  else if (command.gikaReschedule) validatedInput = rescheduleTaskPatchSchema.parse(command.payload);
  else if (command.gikaUpdate) validatedInput = updateTaskPatchSchema.parse(command.payload);
  else if (writingContent) {
    const schemas = { activity: activityInputSchema, category: categoryInputSchema, note: noteInputSchema, shoppingList: shoppingListInputSchema, shoppingItem: shoppingItemInputSchema };
    validatedInput = schemas[type as keyof typeof schemas].parse(command.payload);
  } else if (action === 'setStatus') validatedInput = z.object({ status: z.enum(['pending', 'completed', 'canceled']) }).strict().parse(command.payload);
  else if (action === 'setChecked') validatedInput = z.object({ listId: entityIdSchema, checked: z.boolean() }).strict().parse(command.payload);
  else validatedInput = (type === 'shoppingItem' ? itemLocatorSchema : emptySchema).parse(command.payload);

  // Minimal reconciliation snapshot in the EXISTING atomic receipt, never a second writer/outbox.
  let gika: { requestTextHash: string; task: CreateTaskDescriptor } | undefined;
  let gikaShopping: { requestTextHash: string; list: CreateShoppingListDescriptor } | undefined;
  if (command.gikaShopping) {
    const list = createShoppingListDescriptorSchema.parse({ title: validatedInput.title });
    const canonical = shoppingListCommandFields(list, command.operationId, command.gikaShopping.requestTextHash);
    if (commandHash(command) !== commandHash(canonical)) throw new AppError(422, 'VALIDATION_ERROR', 'Confira os dados da lista de compras.');
    gikaShopping = { ...command.gikaShopping, list };
  }
  if (command.gika) {
    const activity = activityInputSchema.parse(validatedInput);
    if (command.command !== 'activity.create' || activity.schedule.type !== 'task') throw new AppError(422, 'VALIDATION_ERROR', 'Confira os dados da tarefa.');
    const task = createTaskDescriptorSchema.parse({ title: activity.title, dueDate: activity.schedule.dueDate, dueTime: activity.schedule.dueTime, timeZone: activity.schedule.timeZone });
    if (command.entityId !== command.operationId || command.expectedRevision !== 0 || command.clientCreatedAt !== undefined || command.dependsOn !== undefined
      || commandHash(command) !== commandHash({ ...command, payload: activityInputSchema.parse(taskActivityInput(task)) })) throw new AppError(422, 'VALIDATION_ERROR', 'Confira os dados da tarefa.');
    gika = { ...command.gika, task };
  }

  if (command.gikaReschedule && (command.command !== 'activity.update'
    || commandHash(command) !== commandHash({ ...command, payload: rescheduleTaskPatchSchema.parse(validatedInput) }))) throw new AppError(422, 'VALIDATION_ERROR', 'Confira os dados da tarefa.');

  if (command.gikaUpdate && (command.command !== 'activity.update'
    || commandHash(command) !== commandHash({ ...command, payload: updateTaskPatchSchema.parse(validatedInput) }))) throw new AppError(422, 'VALIDATION_ERROR', 'Confira os dados da tarefa.');

  if (command.gikaCompletion && (command.command !== 'activity.setStatus' || validatedInput.status !== 'completed'
    || command.clientCreatedAt !== undefined || command.dependsOn !== undefined
    || commandHash(command) !== commandHash({ ...command, payload: { status: 'completed' } }))) throw new AppError(422, 'VALIDATION_ERROR', 'Confira os dados da tarefa.');

  if (command.gikaUndo) {
    if (command.gikaUndo.uid !== identity.uid) throw new AppError(403, 'FORBIDDEN', 'Entre na conta que adicionou essa tarefa para desfazer.');
    const canonical = await creationUndoEnvelope({ uid: identity.uid, creationOperationId: command.gikaUndo.creationOperationId, entityId: command.entityId, revision: 1 });
    if (commandHash(command) !== commandHash(canonical)) throw new AppError(422, 'VALIDATION_ERROR', 'Não foi possível validar essa ação.');
  }

  const root = db.doc(`users/${identity.uid}`);
  const parent = type === 'shoppingItem' ? root.collection('shoppingLists').doc(String(validatedInput.listId)) : null;
  const target = parent ? parent.collection('items').doc(command.entityId) : root.collection(collection).doc(command.entityId);
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const countsRef = root.collection('internal').doc('counts');
  const now = new Date().toISOString();
  const minuteRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 16)}`);
  const dayRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 10)}`);
  const digest = commandHash(command);

  return db.runTransaction(async transaction => {
    // Hydrate afresh per transactional attempt; never retain an input from a retried callback.
    let input = validatedInput;
    const [profile, membership, controls, receipt, counts, minute, day, entity, creationReceipt] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), db.doc('serviceControls/global'), receiptRef, countsRef, minuteRef, dayRef, target, ...(command.gikaUndo ? [db.doc(`commandReceipts/${identity.uid}_${command.gikaUndo.creationOperationId}`)] : []));
    if (membership?.data()?.state !== 'active' || profile?.data()?.accountState !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    let creationServerTime: string | undefined;
    if (command.gikaUndo) {
      const source = creationReceipt?.data();
      const original = commandCreationResultSchema.safeParse(source?.response);
      if (source?.uid !== identity.uid || !createTaskDescriptorSchema.safeParse(source?.gika?.task).success
        || !original.success || original.data.operationId !== command.gikaUndo.creationOperationId || original.data.entityId !== command.entityId) {
        throw new AppError(403, 'FORBIDDEN', 'Não foi possível validar a criação original.');
      }
      creationServerTime = original.data.serverTime;
    }
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (command.gikaShopping && controls?.data()?.mode !== 'normal') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Mantenha seu rascunho.');
    const batchConfirmation = command.gikaBatch ? verifyBatchConfirmation(identity.uid, command) : undefined;
    if (batchConfirmation) {
      if (controls?.data()?.mode !== 'normal') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Sua agenda continua disponível.');
      await assertBatchPending(transaction, identity.uid, command, batchConfirmation);
    }
    const confirmation = command.gikaReschedule ? verifyConfirmation(identity.uid, command) : undefined;
    const recurrenceEffect = command.gikaRecurrence ? recurrenceEffectSchema.parse(verifyRecurrenceConfirmation(identity.uid, command)) : undefined;
    if (recurrenceEffect && controls?.data()?.mode !== 'normal') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Sua agenda continua disponível.');
    if (controls?.data()?.mode === 'restricted') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Mantenha seu rascunho.');
    if ((minute?.data()?.count ?? 0) >= 60 || (day?.data()?.count ?? 0) >= 1000) throw new AppError(429, 'LIMIT_EXCEEDED', 'Limite de alterações atingido. Tente mais tarde.');
    if (command.clientCreatedAt && Date.now() - Date.parse(command.clientCreatedAt) > 72 * 3600_000) throw new AppError(409, 'OPERATION_EXPIRED', 'Esta alteração antiga precisa ser revisada antes do envio.');

    const old = entity?.data();
    if (batchConfirmation) {
      if (!old || old.deletedAt || old.revision !== command.expectedRevision || old.status !== 'pending') throw new AppError(409, 'REVISION_CONFLICT', 'Uma tarefa dessa prévia mudou. Faça o pedido novamente.');
      input = batchConfirmation.plan.action === 'complete' ? { status: 'completed' } : applyReschedulePatch(old, rescheduleTaskPatchSchema.parse(validatedInput));
    }
    if (recurrenceEffect) {
      if (recurrenceEffect.scope !== 'occurrence' || !old || old.deletedAt || old.revision !== command.expectedRevision) throw new AppError(409, 'REVISION_CONFLICT', 'Essa rotina mudou. Faça o pedido novamente.');
      const series = await transaction.get(root.collection('series').doc(recurrenceEffect.recurrence.seriesId));
      assertRecurrenceSnapshot(recurrenceEffect, series.data() ?? {}, old);
      if (recurrenceEffect.operation === 'complete') {
        if (old.status !== 'pending') throw new AppError(422, 'GIKA_NO_CHANGE', 'Essa tarefa não está pendente. Confira sua agenda.');
        input = { status: 'completed' };
      } else {
        if (recurrenceEffect.operation === 'update' ? old.title === recurrenceEffect.patch.title : old.schedule.dueDate === recurrenceEffect.patch.dueDate && old.schedule.dueTime === (recurrenceEffect.patch.dueTime ?? old.schedule.dueTime)) throw new AppError(422, 'GIKA_NO_CHANGE', 'Essa tarefa já está como você pediu.');
        input = applyRecurrencePatch(old, recurrenceEffect);
      }
    }
    let rescheduleTask: RescheduleDescriptor | undefined;
    if (command.gikaReschedule) {
      if (!old || old.deletedAt || old.revision !== command.expectedRevision) throw new AppError(409, 'REVISION_CONFLICT', 'Essa tarefa mudou antes do reagendamento. Faça o pedido novamente.');
      if (old.kind !== 'task' || old.schedule?.type !== 'task' || !old.schedule.dueDate || old.seriesId || old.occurrenceKey) throw new AppError(422, 'GIKA_POLICY', 'Para mover este item, use sua agenda.');
      const patch = rescheduleTaskPatchSchema.parse(validatedInput);
      if (old.schedule.dueDate === patch.dueDate && old.schedule.dueTime === (patch.dueTime ?? old.schedule.dueTime)) throw new AppError(422, 'GIKA_NO_CHANGE', 'Essa tarefa já está nessa data e horário.');
      if (confirmation && (confirmation.action.task.title !== old.title || confirmation.summary.before.dueDate !== old.schedule.dueDate || confirmation.summary.before.dueTime !== old.schedule.dueTime || confirmation.action.task.timeZone !== old.schedule.timeZone)) throw new AppError(409, 'REVISION_CONFLICT', 'Essa tarefa mudou antes do reagendamento. Faça o pedido novamente.');
      input = applyReschedulePatch(old, patch);
      rescheduleTask = rescheduleDescriptorSchema.parse({ id: command.entityId, title: old.title, dueDate: old.schedule.dueDate, dueTime: old.schedule.dueTime, timeZone: old.schedule.timeZone, revision: old.revision, patch });
    }
    let updateTask: UpdateDescriptor | undefined;
    if (command.gikaUpdate) {
      if (!old || old.deletedAt || old.revision !== command.expectedRevision) throw new AppError(409, 'REVISION_CONFLICT', 'Essa tarefa mudou enquanto você estava editando. Faça o pedido novamente.');
      if (old.kind !== 'task' || old.schedule?.type !== 'task' || old.seriesId || old.occurrenceKey) throw new AppError(422, 'GIKA_POLICY', 'Essa tarefa não está disponível para edição. Confira sua agenda.');
      const patch = updateTaskPatchSchema.parse(validatedInput);
      if (old.title === patch.title) throw new AppError(422, 'GIKA_NO_CHANGE', 'O título dessa tarefa já é esse. Confira sua agenda.');
      input = applyTitlePatch(old, patch);
      updateTask = updateDescriptorSchema.parse({ id: command.entityId, title: old.title, dueDate: old.schedule.dueDate, timeZone: profile!.data()!.timeZone, revision: old.revision, patch });
    }
    let completionTask: CompletionDescriptor | undefined;
    if (command.gikaCompletion) {
      if (!old || old.deletedAt || old.revision !== command.expectedRevision) throw new AppError(409, 'REVISION_CONFLICT', 'Essa tarefa foi alterada. Confira sua agenda e envie um novo pedido.');
      if (old.kind !== 'task' || old.schedule?.type !== 'task' || old.seriesId || old.occurrenceKey || old.status !== 'pending') throw new AppError(422, 'GIKA_POLICY', 'Essa tarefa não está disponível para conclusão. Confira sua agenda.');
      completionTask = completionDescriptorSchema.parse({ id: command.entityId, title: old.title, dueDate: old.schedule.dueDate, timeZone: profile!.data()!.timeZone, revision: old.revision });
    }
    if (command.gikaUndo && (!old || old.deletedAt)) throw new AppError(409, 'GIKA_UNDO_ALREADY_REMOVED', 'Essa tarefa já foi removida.');
    if (command.gikaUndo && (old?.revision !== 1 || old?.seriesId || old?.createdAt !== creationServerTime)) throw new AppError(409, 'REVISION_CONFLICT', 'Não foi possível desfazer porque essa tarefa foi alterada.');
    const creating = action === 'create' || (type === 'note' && action === 'save' && command.expectedRevision === 0);
    if (creating && command.expectedRevision !== 0) throw new AppError(409, 'REVISION_CONFLICT', 'A criação precisa partir de uma versão vazia.');
    if (creating ? Boolean(old) : !old) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Não foi possível abrir ou criar este item.');
    if (!creating && old?.revision !== command.expectedRevision) throw new AppError(409, 'REVISION_CONFLICT', 'Este item mudou em outra sessão. Seu rascunho foi preservado.', { current: old });
    if (!creating && old?.deletedAt && action !== 'restore') throw new AppError(409, 'ENTITY_DELETED', 'Este item está na lixeira. Seu rascunho foi preservado.');
    if (action === 'restore' && (!old?.deletedAt || old.purgingAt || typeof old.purgeAfter !== 'string' || old.purgeAfter <= now)) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Este item não está disponível para restauração.');

    const references: DocumentReference[] = [];
    if (parent) references.push(parent);
    if (type === 'activity' && writingContent && input.categoryId) references.push(root.collection('categories').doc(String(input.categoryId)));
    if (type === 'note' && writingContent) (input.linkedActivityIds as string[]).forEach(id => references.push(root.collection('activities').doc(id)));
    const linked = references.length ? await transaction.getAll(...references) : [];
    for (const reference of linked) {
      if (!reference.exists || reference.data()?.deletedAt || reference.data()?.archivedAt) throw new AppError(422, 'REFERENCE_UNAVAILABLE', 'Uma categoria, atividade ou lista vinculada não está disponível.');
    }
    const parentData = parent ? linked[0]?.data() : null;
    if (creating && (parent ? parentData?.itemCount ?? 0 : (counts?.data()?.[collection] ?? 0) + (counts?.data()?.[`reserved_${collection}`] ?? 0)) >= limits[collection]!) throw new AppError(422, 'STOCK_LIMIT', 'Você atingiu o limite de itens desta coleção.');
    if (type === 'category' && writingContent) {
      const matching = await transaction.get(root.collection('categories').where('normalizedName', '==', String(input.name).toLocaleLowerCase('pt-BR')).limit(2));
      if (matching.docs.some(document => document.id !== command.entityId && !document.data().deletedAt)) throw new AppError(422, 'DUPLICATE_CATEGORY', 'Já existe uma categoria com esse nome.');
    }

    const revision = creating ? 1 : old!.revision + 1;
    let next: Record<string, unknown> = { ...(old ?? {}), ...(writingContent ? input : {}), revision, schemaVersion: 1, updatedAt: now };
    if (creating) next = { ...next, createdAt: now, deletedAt: null };
    if (type === 'activity' && writingContent) {
      const activity = activityInputSchema.parse(input);
      next = { ...next, ...scheduleInstants(activity.schedule), kind: activity.schedule.type, status: old?.status ?? 'pending', completedAt: old?.completedAt ?? null, seriesId: old?.seriesId ?? null, occurrenceKey: old?.occurrenceKey ?? null };
    }
    if (type === 'category' && writingContent) next = { ...next, normalizedName: String(input.name).toLocaleLowerCase('pt-BR'), archivedAt: old?.archivedAt ?? null };
    if (type === 'note' && writingContent) next.plainText = notePlainText(noteInputSchema.parse(input).bodyDoc);
    if (type === 'shoppingList' && writingContent) next = { ...next, sourceTemplateId: old?.sourceTemplateId ?? null, archivedAt: old?.archivedAt ?? null, itemCount: old?.itemCount ?? 0, pendingItemCount: old?.pendingItemCount ?? old?.itemCount ?? 0 };
    if (type === 'shoppingItem' && creating) next = { ...next, checked: false, checkedAt: null };
    if (action === 'setStatus') {
      next = { ...next, status: input.status, completedAt: input.status === 'completed' ? now : null };
    }
    if (action === 'setChecked') next = { ...next, checked: input.checked, checkedAt: input.checked ? now : null };
    if (action === 'archive') next.archivedAt = now;
    if (action === 'trash') next = { ...next, deletedAt: now, purgeAfter: new Date(Date.now() + 30 * 86400_000).toISOString() };
    if (action === 'restore') next = { ...next, deletedAt: null, purgeAfter: null };

    const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision, serverTime: now, result: 'applied' };
    if (creating) transaction.create(target, next); else transaction.set(target, next);
    if (creating) {
      if (parent) transaction.update(parent, { itemCount: (parentData?.itemCount ?? 0) + 1, pendingItemCount: (parentData?.pendingItemCount ?? parentData?.itemCount ?? 0) + 1, summaryUpdatedAt: now, updatedAt: now });
      else transaction.set(countsRef, { [collection]: (counts?.data()?.[collection] ?? 0) + 1 }, { merge: true });
    }
    if (parent && !creating) {
      const pendingDelta = action === 'setChecked'
        ? pendingShoppingItemDelta('setChecked', old?.checked === true, input.checked === true)
        : action === 'trash' || action === 'restore' ? pendingShoppingItemDelta(action, old?.checked === true) : 0;
      if (pendingDelta) transaction.update(parent, { pendingItemCount: Math.max(0, (parentData?.pendingItemCount ?? parentData?.itemCount ?? 0) + pendingDelta), summaryUpdatedAt: now, updatedAt: now });
    }
    transaction.update(root, { dataVersion: profile!.data()!.dataVersion + 1, updatedAt: now });
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now, ...(gikaShopping ? { gikaShopping } : {}), ...(gika ? { gika } : {}), ...(batchConfirmation ? { gikaBatch: { ...command.gikaBatch!, confirmation: batchConfirmation } } : {}), ...(recurrenceEffect ? { gikaRecurrence: recurrenceReceipt(command, recurrenceEffect) } : {}), ...(rescheduleTask ? { gikaReschedule: { ...command.gikaReschedule, task: rescheduleTask, ...(confirmation ? { confirmation } : {}) } } : {}), ...(completionTask ? { gikaCompletion: { ...command.gikaCompletion, task: completionTask } } : {}), ...(updateTask ? { gikaUpdate: { ...command.gikaUpdate, task: updateTask } } : {}) });
    transaction.set(minuteRef, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
    transaction.set(dayRef, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });

    if (type === 'activity' && next.status === 'pending' && !next.deletedAt) createReminderJobs(transaction, identity.uid, command.entityId, revision, next, now);
    return response;
  });
}

async function updateFutureActivities(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const conventionalInput = command.gikaRecurrence ? undefined : recurringFutureUpdateSchema.parse(command.payload);
  const proposed = command.gikaRecurrence ? z.object({ patch: z.union([updateTaskPatchSchema, rescheduleTaskPatchSchema]), newSeriesId: z.uuid() }).strict().parse(command.payload) : undefined;
  const newSeriesId = (proposed?.newSeriesId ?? conventionalInput!.newSeriesId);
  const root = db.doc(`users/${identity.uid}`);
  const occurrenceRef = root.collection('activities').doc(command.entityId);
  const nextSeriesRef = root.collection('series').doc(newSeriesId);
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const countsRef = root.collection('internal').doc('counts');
  const now = new Date().toISOString();
  const minuteRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 16)}`);
  const dayRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 10)}`);
  const digest = commandHash(command);
  return db.runTransaction(async transaction => {
    const [profile, member, receipt, occurrence, nextSeries, counts, controls, minute, day] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), receiptRef, occurrenceRef, nextSeriesRef, countsRef, db.doc('serviceControls/global'), minuteRef, dayRef);
    if (profile?.data()?.accountState !== 'active' || member?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    const effect = command.gikaRecurrence ? recurrenceEffectSchema.parse(verifyRecurrenceConfirmation(identity.uid, command)) : undefined;
    if (effect && (effect.scope !== 'future' || effect.newSeriesId !== newSeriesId)) throw new AppError(422, 'GIKA_POLICY', 'Esse escopo não está disponível.');
    if (controls?.data()?.mode !== 'normal') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Sua agenda continua disponível.');
    if ((minute?.data()?.count ?? 0) >= 60 || (day?.data()?.count ?? 0) >= 1000) throw new AppError(429, 'LIMIT_EXCEEDED', 'Limite de alterações atingido. Tente mais tarde.');
    if (command.clientCreatedAt && Date.now() - Date.parse(command.clientCreatedAt) > 72 * 3600_000) throw new AppError(409, 'OPERATION_EXPIRED', 'Esta alteração antiga precisa ser revisada antes do envio.');
    const current = occurrence?.data();
    if (!current || current.deletedAt || current.revision !== command.expectedRevision || !current.seriesId || !current.occurrenceKey) throw new AppError(409, 'REVISION_CONFLICT', 'A série mudou em outra sessão. Seu rascunho foi preservado.');
    if (nextSeries?.exists) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Não foi possível separar esta série.');
    const seriesRef = root.collection('series').doc(current.seriesId);
    const series = await transaction.get(seriesRef);
    if (!series.exists || series.data()?.state !== 'active') throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Esta série não está mais ativa.');
    const futureQuery = root.collection('activities').where('seriesId', '==', current.seriesId).where('occurrenceKey', '>=', current.occurrenceKey).limit(effect ? GIKA_RECURRENCE_FUTURE_LIMIT + 1 : 366);
    const future = await transaction.get(futureQuery);
    let input = conventionalInput;
    if (effect) {
      const members: RecurrenceMember[] = future.docs.map(document => ({ id: document.id, data: document.data() }));
      assertRecurrenceSnapshot(effect, series.data()!, current, members);
      if (effect.operation === 'update' ? current.title === effect.patch.title : current.schedule.dueDate === effect.patch.dueDate && current.schedule.dueTime === (effect.patch.dueTime ?? current.schedule.dueTime)) throw new AppError(422, 'GIKA_NO_CHANGE', 'Essa tarefa já está como você pediu.');
      input = { activity: applyRecurrencePatch(current, effect), newSeriesId };
      if (input.activity.categoryId) {
        const category = await transaction.get(root.collection('categories').doc(input.activity.categoryId));
        if (!category.exists || category.data()?.deletedAt || category.data()?.archivedAt) throw new AppError(422, 'REFERENCE_UNAVAILABLE', 'A categoria não está disponível.');
      }
    }
    if (!input) throw new AppError(422, 'VALIDATION_ERROR', 'Confira os dados da rotina.');
    const oldRule = series.data()!.recurrence;
    const pastCount = Math.max(0, (series.data()!.materializedCount ?? future.size) - future.size);
    if (effect && oldRule.count && oldRule.count - pastCount < 2) throw new AppError(422, 'GIKA_POLICY', 'Restam menos de duas ocorrências. Altere somente esta tarefa.');
    const nextRule = { ...oldRule, count: oldRule.count ? Math.max(2, oldRule.count - pastCount) : null };
    const firstDate = input.activity.schedule.type === 'task' ? input.activity.schedule.dueDate : input.activity.schedule.startDate;
    if (!firstDate) throw new AppError(422, 'VALIDATION_ERROR', 'Uma atividade recorrente precisa de data.');
    if (recurrenceDates(firstDate, nextRule, 2).length < 2) throw new AppError(422, 'VALIDATION_ERROR', 'Restam menos de duas ocorrências; edite somente esta ocorrência.');
    const horizon = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
    const dates = recurrenceDatesThrough(firstDate, nextRule, horizon);
    // Conservative bounded execution, including potential reminder writes; no partial split.
    const automaticReminderCount = input.activity.reminderSpecs.some(spec => spec.minutesBefore === 0) ? 0 : 1;
    if (effect && (!dates.length || dates.length > GIKA_RECURRENCE_FUTURE_LIMIT || future.size + dates.length * (1 + input.activity.reminderSpecs.length + automaticReminderCount) + 7 > 450)) throw new AppError(422, 'GIKA_POLICY', 'Essa alteração precisa ser feita pela sua agenda.');
    future.docs.forEach(document => transaction.delete(document.ref));
    transaction.update(seriesRef, { state: 'split', splitAt: current.occurrenceKey, updatedAt: now });
    transaction.create(nextSeriesRef, { activity: input.activity, recurrence: nextRule, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now, materializedThrough: dates.at(-1) ?? firstDate, materializedCount: dates.length, state: 'active', previousSeriesId: current.seriesId });
    for (const occurrenceKey of dates) {
      const schedule = moveScheduleToDate(input.activity.schedule, occurrenceKey);
      const id = hashValue(`${identity.uid}:${input.newSeriesId}:${occurrenceKey}`).slice(0, 32);
      const occurrence = { ...input.activity, schedule, ...scheduleInstants(schedule), kind: schedule.type, status: 'pending', completedAt: null, seriesId: input.newSeriesId, occurrenceKey, revision: 1, schemaVersion: 1, deletedAt: null, createdAt: now, updatedAt: now };
      transaction.create(root.collection('activities').doc(id), occurrence);
      createReminderJobs(transaction, identity.uid, id, 1, occurrence, now);
    }
    const delta = dates.length - future.size;
    if ((counts?.data()?.activities ?? 0) + delta + (effect ? counts?.data()?.reserved_activities ?? 0 : 0) > limits.activities!) throw new AppError(422, 'STOCK_LIMIT', 'Você atingiu o limite de atividades.');
    const response: CommandResult = { operationId: command.operationId, entityId: input.newSeriesId, revision: 1, serverTime: now, result: 'applied' };
    transaction.set(countsRef, { activities: Math.max(0, (counts?.data()?.activities ?? 0) + delta), ...(effect ? { series: (counts?.data()?.series ?? 0) + 1 } : {}) }, { merge: true });
    transaction.update(root, { dataVersion: (profile?.data()?.dataVersion ?? 0) + 1, updatedAt: now });
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now, ...(effect ? { gikaRecurrence: recurrenceReceipt(command, effect) } : {}) });
    transaction.set(minuteRef, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
    transaction.set(dayRef, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });
    return response;
  });
}

async function trashActivitySeries(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const root = db.doc(`users/${identity.uid}`);
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const occurrenceRef = root.collection('activities').doc(command.entityId);
  const now = new Date().toISOString();
  const minuteRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 16)}`);
  const dayRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 10)}`);
  const digest = commandHash(command);
  return db.runTransaction(async transaction => {
    const [profile, member, controls, receipt, occurrence, minute, day] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), db.doc('serviceControls/global'), receiptRef, occurrenceRef, minuteRef, dayRef);
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    const current = occurrence?.data();
    if (profile?.data()?.accountState !== 'active' || member?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (controls?.data()?.mode !== 'normal') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Sua agenda continua disponível.');
    if ((minute?.data()?.count ?? 0) >= 60 || (day?.data()?.count ?? 0) >= 1000) throw new AppError(429, 'LIMIT_EXCEEDED', 'Limite de alterações atingido. Tente mais tarde.');
    if (command.clientCreatedAt && Date.now() - Date.parse(command.clientCreatedAt) > 72 * 3600_000) throw new AppError(409, 'OPERATION_EXPIRED', 'Esta alteração antiga precisa ser revisada antes do envio.');
    if (!current || current.deletedAt || current.revision !== command.expectedRevision || !current.seriesId) throw new AppError(409, 'REVISION_CONFLICT', 'Esta ocorrência mudou em outra sessão.');
    const seriesRef = root.collection('series').doc(String(current.seriesId));
    const series = await transaction.get(seriesRef);
    if (!series.exists) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'A série não está disponível.');
    const occurrences = await transaction.get(root.collection('activities').where('seriesId', '==', current.seriesId).limit(500));
    for (const document of occurrences.docs) {
      if (!document.data().deletedAt) transaction.update(document.ref, { deletedAt: now, purgeAfter: new Date(Date.now() + 30 * 86400_000).toISOString(), revision: (document.data().revision ?? 0) + 1, updatedAt: now });
    }
    transaction.update(seriesRef, { state: 'trashed', deletedAt: now, purgeAfter: new Date(Date.now() + 30 * 86400_000).toISOString(), updatedAt: now });
    const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision: current.revision + 1, serverTime: now, result: 'applied' };
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.update(root, { dataVersion: (profile?.data()?.dataVersion ?? 0) + 1, updatedAt: now });
    transaction.set(minuteRef, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
    transaction.set(dayRef, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });
    return response;
  });
}

async function purgeContent(identity: DecodedIdToken, command: CommandEnvelope, type: string, collection: string): Promise<CommandResult> {
  const input = (type === 'shoppingItem' ? itemLocatorSchema : emptySchema).parse(command.payload);
  const root = db.doc(`users/${identity.uid}`);
  const parent = type === 'shoppingItem' ? root.collection('shoppingLists').doc(String(input.listId)) : null;
  const target = parent ? parent.collection('items').doc(command.entityId) : root.collection(collection).doc(command.entityId);
  const receipt = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const countsRef = root.collection('internal').doc('counts');
  const now = new Date().toISOString();
  const digest = commandHash(command);
  const prepared = await db.runTransaction(async transaction => {
    const [profile, member, previous, entity] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), receipt, target);
    if (previous?.exists) {
      if (previous.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      if (previous.data()?.response) return previous.data()!.response as CommandResult;
      return null;
    }
    if (profile?.data()?.accountState !== 'active' || member?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (!entity?.exists || !entity.data()?.deletedAt || entity.data()?.revision !== command.expectedRevision) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Este item não está disponível para exclusão.');
    transaction.create(receipt, { uid: identity.uid, hash: digest, state: 'prepared', createdAt: now });
    transaction.update(target, { purgingAt: now });
    return null;
  });
  if (prepared) return { ...prepared, result: 'alreadyApplied' };
  await db.recursiveDelete(target);
  const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision: (command.expectedRevision ?? 0) + 1, serverTime: now, result: 'applied' };
  await db.runTransaction(async transaction => {
    const [profile, currentReceipt, counts, parentSnapshot] = await transaction.getAll(root, receipt, countsRef, ...(parent ? [parent] : []));
    if (currentReceipt?.data()?.response) return;
    transaction.update(receipt, { state: 'completed', response, completedAt: now });
    if (parent && parentSnapshot?.exists) transaction.update(parent, { itemCount: Math.max(0, (parentSnapshot.data()?.itemCount ?? 1) - 1), updatedAt: now });
    else transaction.set(countsRef, { [collection]: Math.max(0, (counts?.data()?.[collection] ?? 1) - 1) }, { merge: true });
    if (profile?.exists) transaction.update(root, { dataVersion: (profile.data()?.dataVersion ?? 0) + 1, updatedAt: now });
  });
  return response;
}

async function createActivitySeries(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const input = recurringActivityInputSchema.parse(command.payload);
  const schedule = input.activity.schedule;
  const firstDate = schedule.type === 'task' ? schedule.dueDate : schedule.startDate;
  if (!firstDate) throw new AppError(422, 'VALIDATION_ERROR', 'Uma atividade recorrente precisa de data.');
  if (command.expectedRevision !== 0) throw new AppError(409, 'REVISION_CONFLICT', 'A série precisa partir de uma versão vazia.');
  if (recurrenceDates(firstDate, input.recurrence, 2).length < 2) throw new AppError(422, 'VALIDATION_ERROR', 'A recorrência precisa gerar ao menos duas ocorrências.');
  const horizon = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
  const dates = recurrenceDatesThrough(firstDate, input.recurrence, horizon);
  const root = db.doc(`users/${identity.uid}`);
  const seriesRef = root.collection('series').doc(command.entityId);
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const countsRef = root.collection('internal').doc('counts');
  const now = new Date().toISOString();
  const minuteRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 16)}`);
  const dayRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 10)}`);
  const digest = commandHash(command);
  return db.runTransaction(async transaction => {
    const [profile, member, controls, receipt, counts, series, minute, day, category] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), db.doc('serviceControls/global'), receiptRef, countsRef, seriesRef, minuteRef, dayRef, ...(input.activity.categoryId ? [root.collection('categories').doc(input.activity.categoryId)] : []));
    if (member?.data()?.state !== 'active' || profile?.data()?.accountState !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (controls?.data()?.mode !== 'normal') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Mantenha seu rascunho.');
    if ((minute?.data()?.count ?? 0) >= 60 || (day?.data()?.count ?? 0) >= 1000) throw new AppError(429, 'LIMIT_EXCEEDED', 'Limite de alterações atingido. Tente mais tarde.');
    if (command.clientCreatedAt && Date.now() - Date.parse(command.clientCreatedAt) > 72 * 3600_000) throw new AppError(409, 'OPERATION_EXPIRED', 'Esta alteração antiga precisa ser revisada antes do envio.');
    if (series?.exists) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Não foi possível criar esta série.');
    if (input.activity.categoryId && (!category?.exists || category.data()?.deletedAt || category.data()?.archivedAt)) throw new AppError(422, 'REFERENCE_UNAVAILABLE', 'A categoria não está disponível.');
    if ((counts?.data()?.activities ?? 0) + (counts?.data()?.reserved_activities ?? 0) + dates.length > limits.activities!) throw new AppError(422, 'STOCK_LIMIT', 'Você atingiu o limite de atividades.');
    transaction.create(seriesRef, { activity: input.activity, recurrence: input.recurrence, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now, materializedThrough: dates.at(-1) ?? firstDate, materializedCount: dates.length, state: 'active' });
    for (const occurrenceKey of dates) {
      const occurrenceSchedule = moveScheduleToDate(input.activity.schedule, occurrenceKey);
      const occurrenceId = hashValue(`${identity.uid}:${command.entityId}:${occurrenceKey}`).slice(0, 32);
      const occurrence = { ...input.activity, schedule: occurrenceSchedule, ...scheduleInstants(occurrenceSchedule), kind: occurrenceSchedule.type, status: 'pending', completedAt: null, seriesId: command.entityId, occurrenceKey, revision: 1, schemaVersion: 1, deletedAt: null, createdAt: now, updatedAt: now };
      transaction.create(root.collection('activities').doc(occurrenceId), occurrence);
      createReminderJobs(transaction, identity.uid, occurrenceId, 1, occurrence, now);
    }
    const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision: 1, serverTime: now, result: 'applied' };
    transaction.set(countsRef, { activities: (counts?.data()?.activities ?? 0) + dates.length, series: (counts?.data()?.series ?? 0) + 1 }, { merge: true });
    transaction.update(root, { dataVersion: (profile?.data()?.dataVersion ?? 0) + 1, updatedAt: now });
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.set(minuteRef, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
    transaction.set(dayRef, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });
    return response;
  });
}

async function createShoppingCycle(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const input = shoppingCycleInputSchema.parse(command.payload);
  const root = db.doc(`users/${identity.uid}`);
  const templateRef = root.collection('shoppingLists').doc(input.templateId);
  const target = root.collection('shoppingLists').doc(command.entityId);
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const countsRef = root.collection('internal').doc('counts');
  const cycleRef = root.collection('internal').doc(`shoppingCycle_${hashValue(`${input.templateId}:${input.cycleKey}`)}`);
  const now = new Date().toISOString();
  const digest = commandHash(command);
  const minuteRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 16)}`);
  const dayRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 10)}`);

  return db.runTransaction(async transaction => {
    const [profile, membership, controls, receipt, counts, minute, day, template, targetSnapshot, cycle] = await transaction.getAll(
      root, db.doc(`memberships/${identity.uid}`), db.doc('serviceControls/global'), receiptRef, countsRef, minuteRef, dayRef, templateRef, target, cycleRef,
    );
    if (membership?.data()?.state !== 'active' || profile?.data()?.accountState !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (controls?.data()?.mode === 'restricted') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Mantenha seu rascunho.');
    if ((minute?.data()?.count ?? 0) >= 60 || (day?.data()?.count ?? 0) >= 1000) throw new AppError(429, 'LIMIT_EXCEEDED', 'Limite de alterações atingido. Tente mais tarde.');
    if (command.clientCreatedAt && Date.now() - Date.parse(command.clientCreatedAt) > 72 * 3600_000) throw new AppError(409, 'OPERATION_EXPIRED', 'Esta alteração antiga precisa ser revisada antes do envio.');
    const source = template?.data();
    if (!source || source.listKind !== 'template' || source.deletedAt || source.archivedAt) throw new AppError(422, 'REFERENCE_UNAVAILABLE', 'O modelo de compras não está disponível.');
    if (source.revision !== command.expectedRevision) throw new AppError(409, 'REVISION_CONFLICT', 'O modelo mudou em outra sessão. Seu rascunho foi preservado.', { current: source });
    if (targetSnapshot?.exists) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Não foi possível criar esta lista.');
    if (cycle?.exists) throw new AppError(409, 'CYCLE_EXISTS', 'Este modelo já possui uma lista para este mês.');
    if ((counts?.data()?.shoppingLists ?? 0) + (counts?.data()?.reserved_shoppingLists ?? 0) >= limits.shoppingLists!) throw new AppError(422, 'STOCK_LIMIT', 'Você atingiu o limite de listas de compras.');

    const templateItems = await transaction.get(templateRef.collection('items'));
    const items = templateItems.docs.filter(item => !item.data().deletedAt);
    const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision: 1, serverTime: now, result: 'applied' };
    transaction.create(target, {
      title: `${source.title} · ${input.cycleKey}`, listKind: 'cycle', cycleKey: input.cycleKey, sourceTemplateId: input.templateId,
      itemCount: items.length, pendingItemCount: items.length, archivedAt: null, deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now,
    });
    for (const item of items) {
      const sourceItem = item.data();
      transaction.create(target.collection('items').doc(hashValue(`${item.id}:${input.cycleKey}`)), {
        listId: command.entityId, name: sourceItem.name, quantityValue: sourceItem.quantityValue, unit: sourceItem.unit,
        unitLabel: sourceItem.unitLabel, detail: sourceItem.detail, sortOrder: sourceItem.sortOrder, checked: false, checkedAt: null,
        deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now,
      });
    }
    transaction.create(cycleRef, { listId: command.entityId, templateId: input.templateId, cycleKey: input.cycleKey, createdAt: now });
    transaction.update(root, { dataVersion: profile!.data()!.dataVersion + 1, updatedAt: now });
    transaction.set(countsRef, { shoppingLists: (counts?.data()?.shoppingLists ?? 0) + 1 }, { merge: true });
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.set(minuteRef, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
    transaction.set(dayRef, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });
    return response;
  });
}
