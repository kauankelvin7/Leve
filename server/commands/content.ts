import { z } from 'zod';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DocumentReference } from 'firebase-admin/firestore';
import { activityInputSchema, categoryInputSchema, noteInputSchema, notePlainText, scheduleInstants, shoppingItemInputSchema, shoppingListInputSchema } from '../../packages/domain/src/content';
import { entityIdSchema, type CommandEnvelope, type CommandResult } from '../../packages/domain/src/identity';
import { db } from '../platform/firebase';
import { AppError } from '../errors';
import { commandHash, hashValue } from './identity';

const names: Record<string, string> = { activity: 'activities', category: 'categories', note: 'notes', shoppingList: 'shoppingLists', shoppingItem: 'items' };
const limits: Record<string, number> = { activities: 5000, categories: 50, notes: 500, shoppingLists: 50, items: 200 };
const emptySchema = z.object({}).strict();
const itemLocatorSchema = z.object({ listId: entityIdSchema }).strict();
const allowed: Record<string, string[]> = {
  activity: ['create', 'update', 'setStatus', 'trash', 'restore'],
  category: ['create', 'update', 'archive', 'trash', 'restore'],
  note: ['save', 'trash', 'restore'],
  shoppingList: ['create', 'update', 'archive', 'trash', 'restore'],
  shoppingItem: ['create', 'update', 'setChecked', 'trash', 'restore'],
};

export async function contentCommand(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  if (!identity.email_verified) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Confirme seu e-mail para continuar.');
  const [type = '', action = ''] = command.command.split('.');
  const collection = names[type];
  if (!collection || !allowed[type]?.includes(action)) throw new AppError(422, 'VALIDATION_ERROR', 'Comando desconhecido.');
  const writingContent = ['create', 'update', 'save'].includes(action);
  let input: Record<string, unknown>;
  if (writingContent) {
    const schemas = { activity: activityInputSchema, category: categoryInputSchema, note: noteInputSchema, shoppingList: shoppingListInputSchema, shoppingItem: shoppingItemInputSchema };
    input = schemas[type as keyof typeof schemas].parse(command.payload);
  } else if (action === 'setStatus') input = z.object({ status: z.enum(['pending', 'completed', 'canceled']) }).strict().parse(command.payload);
  else if (action === 'setChecked') input = z.object({ listId: entityIdSchema, checked: z.boolean() }).strict().parse(command.payload);
  else input = (type === 'shoppingItem' ? itemLocatorSchema : emptySchema).parse(command.payload);

  const root = db.doc(`users/${identity.uid}`);
  const parent = type === 'shoppingItem' ? root.collection('shoppingLists').doc(String(input.listId)) : null;
  const target = parent ? parent.collection('items').doc(command.entityId) : root.collection(collection).doc(command.entityId);
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const countsRef = root.collection('internal').doc('counts');
  const now = new Date().toISOString();
  const minuteRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 16)}`);
  const dayRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 10)}`);
  const digest = commandHash(command);

  return db.runTransaction(async transaction => {
    const [profile, membership, controls, receipt, counts, minute, day, entity] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), db.doc('serviceControls/global'), receiptRef, countsRef, minuteRef, dayRef, target);
    if (membership?.data()?.state !== 'active' || profile?.data()?.accountState !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (controls?.data()?.mode === 'restricted') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Mantenha seu rascunho.');
    if ((minute?.data()?.count ?? 0) >= 60 || (day?.data()?.count ?? 0) >= 1000) throw new AppError(429, 'LIMIT_EXCEEDED', 'Limite de alterações atingido. Tente mais tarde.');
    if (command.clientCreatedAt && Date.now() - Date.parse(command.clientCreatedAt) > 72 * 3600_000) throw new AppError(409, 'OPERATION_EXPIRED', 'Esta alteração antiga precisa ser revisada antes do envio.');

    const old = entity?.data();
    const creating = action === 'create' || (type === 'note' && action === 'save' && command.expectedRevision === 0);
    if (creating && command.expectedRevision !== 0) throw new AppError(409, 'REVISION_CONFLICT', 'A criação precisa partir de uma versão vazia.');
    if (creating ? Boolean(old) : !old) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Não foi possível abrir ou criar este item.');
    if (!creating && old?.revision !== command.expectedRevision) throw new AppError(409, 'REVISION_CONFLICT', 'Este item mudou em outra sessão. Seu rascunho foi preservado.', { current: old });
    if (!creating && old?.deletedAt && action !== 'restore') throw new AppError(409, 'ENTITY_DELETED', 'Este item está na lixeira. Seu rascunho foi preservado.');
    if (action === 'restore' && (!old?.deletedAt || typeof old.purgeAfter !== 'string' || old.purgeAfter <= now)) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Este item não está disponível para restauração.');

    const references: DocumentReference[] = [];
    if (parent) references.push(parent);
    if (type === 'activity' && writingContent && input.categoryId) references.push(root.collection('categories').doc(String(input.categoryId)));
    if (type === 'note' && writingContent) (input.linkedActivityIds as string[]).forEach(id => references.push(root.collection('activities').doc(id)));
    const linked = references.length ? await transaction.getAll(...references) : [];
    for (const reference of linked) {
      if (!reference.exists || reference.data()?.deletedAt || reference.data()?.archivedAt) throw new AppError(422, 'REFERENCE_UNAVAILABLE', 'Uma categoria, atividade ou lista vinculada não está disponível.');
    }
    const parentData = parent ? linked[0]?.data() : null;
    if (creating && (parent ? parentData?.itemCount ?? 0 : counts?.data()?.[collection] ?? 0) >= limits[collection]!) throw new AppError(422, 'STOCK_LIMIT', 'Você atingiu o limite de itens desta coleção.');
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
    if (type === 'shoppingList' && writingContent) next = { ...next, sourceTemplateId: old?.sourceTemplateId ?? null, archivedAt: old?.archivedAt ?? null, itemCount: old?.itemCount ?? 0 };
    if (type === 'shoppingItem' && creating) next = { ...next, checked: false, checkedAt: null };
    if (action === 'setStatus') {
      if (old?.kind === 'event' && input.status === 'completed') throw new AppError(422, 'VALIDATION_ERROR', 'Compromissos podem ser cancelados, não concluídos como tarefas.');
      next = { ...next, status: input.status, completedAt: input.status === 'completed' ? now : null };
    }
    if (action === 'setChecked') next = { ...next, checked: input.checked, checkedAt: input.checked ? now : null };
    if (action === 'archive') next.archivedAt = now;
    if (action === 'trash') next = { ...next, deletedAt: now, purgeAfter: new Date(Date.now() + 30 * 86400_000).toISOString() };
    if (action === 'restore') next = { ...next, deletedAt: null, purgeAfter: null };

    const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision, serverTime: now, result: 'applied' };
    if (creating) transaction.create(target, next); else transaction.set(target, next);
    if (creating) {
      if (parent) transaction.update(parent, { itemCount: (parentData?.itemCount ?? 0) + 1, updatedAt: now });
      else transaction.set(countsRef, { [collection]: (counts?.data()?.[collection] ?? 0) + 1 }, { merge: true });
    }
    transaction.update(root, { dataVersion: profile!.data()!.dataVersion + 1, updatedAt: now });
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.set(minuteRef, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
    transaction.set(dayRef, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });

    if (type === 'activity' && next.status === 'pending' && !next.deletedAt) {
      const targetAt = next.dueAt ?? next.startsAt;
      if (typeof targetAt === 'string') {
        const specs = next.reminderSpecs as { id: string; minutesBefore: number }[];
        for (const spec of specs) {
          const scheduledAt = new Date(Date.parse(targetAt) - spec.minutesBefore * 60_000).toISOString();
          if (scheduledAt < now) continue;
          const jobId = hashValue(`${identity.uid}:${command.entityId}:${revision}:${spec.id}`);
          const deliveryWindowEnd = new Date(Math.min(Date.parse(scheduledAt) + 3600_000, Date.parse(targetAt) + (spec.minutesBefore === 0 ? 300_000 : 0))).toISOString();
          transaction.create(db.doc(`reminderJobs/${jobId}`), { uid: identity.uid, activityId: command.entityId, activityRevision: revision, reminderSpecId: spec.id, scheduledAt, nextAttemptAt: scheduledAt, deliveryWindowEnd, state: 'pending', attempts: 0, createdAt: now, updatedAt: now });
        }
      }
    }
    return response;
  });
}
