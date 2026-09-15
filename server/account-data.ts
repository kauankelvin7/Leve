import { createHash } from 'node:crypto';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { FieldPath, FieldValue, type Query } from 'firebase-admin/firestore';
import { accountArchiveSchema, accountDeleteSchema, accountImportSchema, archiveReferenceErrors, type AccountArchive } from '../packages/domain/src/archive.ts';
import { activityInputSchema, categoryInputSchema, noteInputSchema, notePlainText, recurringActivityInputSchema, scheduleInstants, shoppingItemInputSchema, shoppingListInputSchema } from '../packages/domain/src/content.ts';
import type { CommandEnvelope, CommandResult, UserProfile } from '../packages/domain/src/identity.ts';
import { AppError } from './errors.ts';
import { auth, db } from './platform/firebase.ts';
import { commandHash } from './commands/identity.ts';
import { hashCanonicalValue, hashValue } from './hash.ts';

function publicProfile(profile: UserProfile): AccountArchive['profile'] {
  return { displayName: profile.displayName, locale: 'pt-BR', timeZone: profile.timeZone, weekStartsOn: profile.weekStartsOn, reduceTransparency: profile.reduceTransparency, colorTheme: profile.colorTheme ?? 'green' };
}

async function documents(path: string) {
  const result: Record<string, unknown>[] = [];
  let cursor: string | null = null;
  while (true) {
    let query = db.collection(path).orderBy(FieldPath.documentId()).limit(50);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    result.push(...snapshot.docs.map(document => ({ id: document.id, ...document.data() })));
    if (snapshot.size < 50) return result;
    cursor = snapshot.docs.at(-1)!.id;
  }
}

export async function exportAccount(identity: DecodedIdToken): Promise<AccountArchive> {
  const root = db.doc(`users/${identity.uid}`);
  const before = await root.get();
  const profile = before.data() as UserProfile | undefined;
  if (!profile || profile.accountState !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
  const [categories, activities, timeEntries, series, notes, lists] = await Promise.all([
    documents(`users/${identity.uid}/categories`), documents(`users/${identity.uid}/activities`),
    documents(`users/${identity.uid}/timeEntries`),
    documents(`users/${identity.uid}/series`), documents(`users/${identity.uid}/notes`), documents(`users/${identity.uid}/shoppingLists`),
  ]);
  const shoppingLists = await Promise.all(lists.map(async list => ({ ...list, items: await documents(`users/${identity.uid}/shoppingLists/${list.id}/items`) })));
  const after = await root.get();
  if (!after.exists || after.data()?.accountState !== 'active' || after.data()?.dataVersion !== profile.dataVersion) throw new AppError(409, 'EXPORT_CHANGED', 'Seus dados mudaram durante a exportação. Tente novamente.');
  return accountArchiveSchema.parse({ format: 'leve-account-export', version: 1, exportedAt: new Date().toISOString(), profile: publicProfile(profile), data: { categories, activities, timeEntries, series, notes, shoppingLists } });
}

function importedId(uid: string, importId: string, type: string, sourceId: string) {
  return createHash('sha256').update(`${uid}:${importId}:${type}:${sourceId}`).digest('hex').slice(0, 32);
}

function inputFields(source: Record<string, unknown>, shape: Record<string, unknown>) {
  return Object.fromEntries(Object.keys(shape).map(key => [key, source[key]]));
}

export async function importAccount(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const input = accountImportSchema.parse(command.payload);
  const archive = input.archive;
  if (Buffer.byteLength(JSON.stringify(archive), 'utf8') > 5 * 1024 * 1024) throw new AppError(413, 'IMPORT_TOO_LARGE', 'O arquivo excede o limite de 5 MB.');
  const referenceErrors = archiveReferenceErrors(archive);
  if (referenceErrors.length) throw new AppError(422, 'IMPORT_REFERENCE_INVALID', 'O arquivo contém vínculos que não existem no próprio arquivo.', { paths: referenceErrors.slice(0, 20) });
  const root = db.doc(`users/${identity.uid}`);
  const receipt = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const importRef = root.collection('imports').doc(input.importId);
  const countsRef = root.collection('internal').doc('counts');
  const controlsRef = db.doc('serviceControls/global');
  const [profileSnapshot, member, existingReceipt, previousImport] = await db.getAll(root, db.doc(`memberships/${identity.uid}`), receipt, importRef);
  const profile = profileSnapshot?.data() as UserProfile | undefined;
  if (!profile || profile.accountState !== 'active' || member?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
  const digest = commandHash(command);
  if (existingReceipt?.exists) {
    if (existingReceipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
    return { ...existingReceipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
  }
  const archiveDigest = hashCanonicalValue(archive);
  const legacyArchiveDigest = hashValue(JSON.stringify(archive));
  const matchesArchive = (storedDigest: unknown) => storedDigest === archiveDigest || storedDigest === legacyArchiveDigest;
  if (previousImport?.exists && !matchesArchive(previousImport.data()?.digest)) throw new AppError(409, 'IMPORT_MISMATCH', 'Esta retomada pertence a outro arquivo.');
  if (previousImport?.data()?.state === 'completed') throw new AppError(409, 'IMPORT_EXISTS', 'Este arquivo já foi importado.');
  const categoryIds = new Map(archive.data.categories.map(item => [item.id, importedId(identity.uid, input.importId, 'category', item.id)]));
  const activityIds = new Map(archive.data.activities.map(item => [item.id, importedId(identity.uid, input.importId, 'activity', item.id)]));
  const seriesIds = new Map(archive.data.series.map(item => [item.id, importedId(identity.uid, input.importId, 'series', item.id)]));
  const listIds = new Map(archive.data.shoppingLists.map(item => [item.id, importedId(identity.uid, input.importId, 'list', item.id)]));
  const writes: Array<{ path: string; value: Record<string, unknown> }> = [];
  const now = new Date().toISOString();
  for (const source of archive.data.categories) {
    const parsed = categoryInputSchema.parse({ ...inputFields(source, categoryInputSchema.shape), name: `${String(source.name ?? '').slice(0, 29)} · ${input.importId.slice(0, 6)}` });
    writes.push({ path: `categories/${categoryIds.get(source.id)}`, value: { ...parsed, normalizedName: parsed.name.toLocaleLowerCase('pt-BR'), archivedAt: null, deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now } });
  }
  for (const source of archive.data.activities) {
    const parsed = activityInputSchema.parse({ title: source.title, descriptionPlain: source.descriptionPlain, schedule: source.schedule, reminderSpecs: source.reminderSpecs, categoryId: source.categoryId && categoryIds.get(String(source.categoryId)) || null, colorHex: source.colorHex ?? null, estimatedMinutes: source.estimatedMinutes ?? null });
    writes.push({ path: `activities/${activityIds.get(source.id)}`, value: { ...parsed, ...scheduleInstants(parsed.schedule), kind: parsed.schedule.type, status: source.status === 'completed' || source.status === 'canceled' ? source.status : 'pending', completedAt: source.status === 'completed' ? now : null, seriesId: source.seriesId ? seriesIds.get(String(source.seriesId)) ?? null : null, occurrenceKey: source.occurrenceKey ?? null, deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now } });
  }
  for (const source of archive.data.timeEntries ?? []) {
    const activityId = activityIds.get(String(source.activityId));
    if (!activityId) continue;
    const entryId = importedId(identity.uid, input.importId, 'timeEntry', source.id);
    const entrySource = source.source === 'manual' ? 'manual' : source.source === 'session' ? 'session' : 'timer';
    writes.push({ path: `timeEntries/${entryId}`, value: { activityId, civilDate: source.civilDate, timeZone: source.timeZone, startedAt: source.startedAt, endedAt: source.endedAt ?? now, durationSeconds: Number(source.durationSeconds) || 0, source: entrySource, ...(typeof source.sessionId === 'string' ? { sessionId: source.sessionId } : {}), deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now } });
  }
  for (const source of archive.data.series) {
    const sourceActivity = source.activity as Record<string, unknown>;
    const parsed = recurringActivityInputSchema.parse({ activity: { ...sourceActivity, categoryId: sourceActivity.categoryId ? categoryIds.get(String(sourceActivity.categoryId)) ?? null : null }, recurrence: source.recurrence });
    writes.push({ path: `series/${seriesIds.get(source.id)}`, value: { ...parsed, revision: 1, schemaVersion: 1, state: source.state === 'active' ? 'active' : 'completed', materializedCount: Number(source.materializedCount) || 0, materializedThrough: source.materializedThrough ?? null, previousSeriesId: source.previousSeriesId ? seriesIds.get(String(source.previousSeriesId)) ?? null : null, createdAt: now, updatedAt: now } });
  }
  for (const source of archive.data.notes) {
    const parsed = noteInputSchema.parse({ ...inputFields(source, noteInputSchema.shape), linkedActivityIds: Array.isArray(source.linkedActivityIds) ? source.linkedActivityIds.map(id => activityIds.get(String(id))).filter(Boolean) : [] });
    writes.push({ path: `notes/${importedId(identity.uid, input.importId, 'note', source.id)}`, value: { ...parsed, plainText: notePlainText(parsed.bodyDoc), deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now } });
  }
  for (const source of archive.data.shoppingLists) {
    const parsed = shoppingListInputSchema.parse({ ...inputFields(source, shoppingListInputSchema.shape), cycleKey: source.listKind === 'cycle' ? source.cycleKey : null });
    const listId = listIds.get(source.id)!;
    writes.push({ path: `shoppingLists/${listId}`, value: { ...parsed, sourceTemplateId: source.sourceTemplateId ? listIds.get(String(source.sourceTemplateId)) ?? null : null, itemCount: source.items.length, pendingItemCount: source.items.filter(item => item.checked !== true).length, archivedAt: null, deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now } });
    for (const item of source.items) {
      const parsedItem = shoppingItemInputSchema.parse({ ...inputFields(item, shoppingItemInputSchema.shape), listId });
      writes.push({ path: `shoppingLists/${listId}/items/${importedId(identity.uid, input.importId, 'item', `${source.id}:${item.id}`)}`, value: { ...parsedItem, checked: item.checked === true, checkedAt: item.checked === true ? now : null, deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now } });
    }
  }
  if (writes.length > 10_000) throw new AppError(422, 'IMPORT_TOO_LARGE', 'O arquivo contém itens demais para uma importação.');

  const importedCounts = { categories: archive.data.categories.length, activities: archive.data.activities.length, series: archive.data.series.length, notes: archive.data.notes.length, shoppingLists: archive.data.shoppingLists.length };
  const prepared = await db.runTransaction(async transaction => {
    const [currentProfile, currentMember, currentImport, currentCounts, controls] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), importRef, countsRef, controlsRef);
    if (!currentProfile?.exists || currentProfile.data()?.accountState !== 'active' || currentMember?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    const activeImportId = currentCounts?.data()?.activeImportId;
    if (currentImport?.exists) {
      if (activeImportId && activeImportId !== input.importId) throw new AppError(409, 'IMPORT_ACTIVE', 'Conclua a importação em andamento antes de iniciar outra.');
      return currentImport.data();
    }
    if (activeImportId && activeImportId !== input.importId) throw new AppError(409, 'IMPORT_ACTIVE', 'Conclua a importação em andamento antes de iniciar outra.');
    const activeImports = Number(controls?.data()?.activeImports ?? 0);
    if (activeImports >= 2) throw new AppError(429, 'BULK_CAPACITY', 'Há duas importações em andamento. Tente novamente mais tarde.');
    for (const [key, amount] of Object.entries(importedCounts)) {
      const limit = key === 'categories' ? 50 : key === 'notes' ? 500 : key === 'shoppingLists' ? 50 : key === 'series' ? 1000 : 5000;
      const used = currentCounts?.data()?.[key] ?? 0;
      const reserved = currentCounts?.data()?.[`reserved_${key}`] ?? 0;
      if (used + reserved + amount > limit) throw new AppError(422, 'STOCK_LIMIT', 'A importação ultrapassa o limite de conteúdo desta conta.');
    }
    transaction.create(importRef, { state: 'prepared', digest: archiveDigest, sourceExportedAt: archive.exportedAt, entityCount: writes.length, cursor: 0, reservedCounts: importedCounts, createdAt: now, updatedAt: now });
    transaction.set(countsRef, { activeImportId: input.importId, ...Object.fromEntries(Object.entries(importedCounts).map(([key, amount]) => [`reserved_${key}`, FieldValue.increment(amount)])) }, { merge: true });
    transaction.set(controlsRef, { activeImports: activeImports + 1 }, { merge: true });
    return { cursor: 0, digest: archiveDigest };
  });
  if (!matchesArchive(prepared?.digest)) throw new AppError(409, 'IMPORT_MISMATCH', 'Esta retomada pertence a outro arquivo.');
  let cursor = prepared?.cursor ?? 0;
  while (cursor < writes.length) {
    cursor = await db.runTransaction(async transaction => {
      const [currentProfile, currentMember, job] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), importRef);
      if (currentProfile?.data()?.accountState !== 'active' || currentMember?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
      const jobData = job?.data();
      if (!jobData || !matchesArchive(jobData.digest)) throw new AppError(409, 'IMPORT_MISMATCH', 'Esta retomada pertence a outro arquivo.');
      const offset = jobData.cursor ?? 0;
      if (jobData.state === 'completed' || offset >= writes.length) return writes.length;
      const nextCursor = Math.min(writes.length, offset + 400);
      for (const write of writes.slice(offset, nextCursor)) transaction.set(root.collection(write.path.split('/')[0]!).doc(write.path.split('/').slice(1).join('/')), write.value);
      transaction.update(importRef, { cursor: nextCursor, updatedAt: new Date().toISOString() });
      transaction.update(root, { dataVersion: FieldValue.increment(1), updatedAt: new Date().toISOString() });
      return nextCursor;
    });
  }
  const response: CommandResult = { operationId: command.operationId, entityId: input.importId, revision: 1, serverTime: now, result: 'applied' };
  await db.runTransaction(async transaction => {
    const [current, job, counts, controls] = await transaction.getAll(root, importRef, countsRef, controlsRef);
    if (!current?.exists || current.data()?.accountState !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (job?.data()?.state === 'completed') return;
    transaction.set(importRef, { state: 'completed', cursor: writes.length, importedAt: now, updatedAt: now }, { merge: true });
    transaction.set(countsRef, { activeImportId: FieldValue.delete(), ...Object.fromEntries(Object.entries(importedCounts).flatMap(([key, amount]) => [[key, FieldValue.increment(amount)], [`reserved_${key}`, FieldValue.increment(-amount)]])) }, { merge: true });
    if (counts?.data()?.activeImportId === input.importId) transaction.set(controlsRef, { activeImports: Math.max(0, Number(controls?.data()?.activeImports ?? 0) - 1) }, { merge: true });
    transaction.update(root, { dataVersion: FieldValue.increment(1), updatedAt: now });
    transaction.create(receipt, { uid: identity.uid, hash: digest, response, createdAt: now });
  });
  return response;
}

export async function deleteAccount(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  accountDeleteSchema.parse(command.payload);
  if (command.entityId !== identity.uid) throw new AppError(403, 'FORBIDDEN', 'Não foi possível concluir esta operação.');
  if (Date.now() / 1000 - identity.auth_time > 300) throw new AppError(401, 'RECENT_LOGIN_REQUIRED', 'Entre novamente antes de excluir a conta.');
  const root = db.doc(`users/${identity.uid}`);
  const now = new Date().toISOString();
  const deletionJob = db.doc(`accountDeletionJobs/${identity.uid}`);
  const [snapshot, job] = await db.getAll(root, deletionJob);
  if (!snapshot?.exists && !job?.exists) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'A conta já não está disponível.');
  const revision = snapshot?.data()?.revision ?? job?.data()?.revision ?? 0;
  if (snapshot?.exists) {
    await db.runTransaction(async transaction => {
      const countsRef = root.collection('internal').doc('counts');
      const controlsRef = db.doc('serviceControls/global');
      const [current, currentJob, counts, controls] = await transaction.getAll(root, deletionJob, countsRef, controlsRef);
      if (!current?.exists) return;
      transaction.update(root, { accountState: 'deleting', dataVersion: FieldValue.increment(1), updatedAt: now });
      transaction.set(deletionJob, { uid: identity.uid, state: 'prepared', revision, startedAt: currentJob?.data()?.startedAt ?? now, updatedAt: now }, { merge: true });
      if (counts?.data()?.activeImportId) {
        transaction.set(countsRef, { activeImportId: FieldValue.delete() }, { merge: true });
        transaction.set(controlsRef, { activeImports: Math.max(0, Number(controls?.data()?.activeImports ?? 0) - 1) }, { merge: true });
      }
    });
  }
  await completeAccountDeletion(identity.uid);
  return { operationId: command.operationId, entityId: identity.uid, revision: revision + 1, serverTime: now, result: 'applied' };
}

async function deleteQuery(query: Query) {
  while (true) {
    const page = await query.limit(400).get();
    if (!page.size) return;
    const batch = db.batch(); page.docs.forEach(document => batch.delete(document.ref)); await batch.commit();
    if (page.size < 400) return;
  }
}

async function completeAccountDeletion(uid: string) {
  const root = db.doc(`users/${uid}`);
  const deletionJob = db.doc(`accountDeletionJobs/${uid}`);
  const job = await deletionJob.get();
  if (!job.exists || job.data()?.state === 'completed') return;
  await Promise.all([
    deleteQuery(db.collection('reminderJobs').where('uid', '==', uid)),
    deleteQuery(db.collection('notificationDevices').where('uid', '==', uid)),
    deleteQuery(db.collection('notificationTokens').where('uid', '==', uid)),
    deleteQuery(db.collection('commandReceipts').where('uid', '==', uid)),
    deleteQuery(db.collection('maintenanceReceipts').where('uid', '==', uid)),
    deleteQuery(db.collection('usageBuckets').orderBy(FieldPath.documentId()).startAt(`${uid}_`).endAt(`${uid}_\uf8ff`)),
  ]);
  await db.recursiveDelete(root);
  await db.doc(`memberships/${uid}`).delete();
  await deletionJob.update({ state: 'data-deleted', updatedAt: new Date().toISOString() });
  try { await auth.deleteUser(uid); }
  catch (failure) { if ((failure as { code?: string }).code !== 'auth/user-not-found') throw failure; }
  await deletionJob.update({ state: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

export async function resumeAccountDeletions() {
  const jobs = await db.collection('accountDeletionJobs').where('state', 'in', ['prepared', 'data-deleted']).limit(2).get();
  let completed = 0;
  for (const job of jobs.docs) { await completeAccountDeletion(job.id); completed++; }
  return { examined: jobs.size, completed };
}
