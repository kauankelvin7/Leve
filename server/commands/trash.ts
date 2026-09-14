import { z } from 'zod';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { createHash } from 'node:crypto';
import type { CommandEnvelope } from '../../packages/domain/src/identity.ts';
import { db } from '../platform/firebase.ts';
import { AppError } from '../errors.ts';
import { contentCommand } from './content.ts';

// One bounded page per request. A fixed cutoff excludes items trashed after confirmation.
export async function emptyTrash(identity: DecodedIdToken, command: CommandEnvelope) {
  const { cutoff } = z.object({ cutoff: z.iso.datetime() }).strict().parse(command.payload);
  if (command.entityId !== identity.uid || !identity.email_verified || cutoff > new Date().toISOString()) throw new AppError(403, 'FORBIDDEN', 'Não foi possível esvaziar a lixeira.');
  const root = db.doc(`users/${identity.uid}`);
  const [profile, member] = await db.getAll(root, db.doc(`memberships/${identity.uid}`));
  if (profile?.data()?.accountState !== 'active' || member?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
  const targets: { path: string; type: string; listId?: string }[] = [
    { path: 'activities', type: 'activity' }, { path: 'notes', type: 'note' }, { path: 'categories', type: 'category' },
  ];
  const lists = await root.collection('shoppingLists').limit(50).get();
  for (const list of lists.docs) targets.push({ path: `shoppingLists/${list.id}/items`, type: 'shoppingItem', listId: list.id });
  // Children first, then parents. Purging a list also removes its retained descendants.
  targets.push({ path: 'shoppingLists', type: 'shoppingList' });
  let removed = 0;
  for (const target of targets) {
    const page = await root.collection(target.path).where('deletedAt', '>', '').where('deletedAt', '<=', cutoff).limit(20 - removed).get();
    for (const entity of page.docs) {
      const hex = createHash('sha256').update(`${command.operationId}:${entity.ref.path}:${entity.data().revision}`).digest('hex');
      const operationId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
      await contentCommand(identity, { command: `${target.type}.purge`, operationId, entityId: entity.id, expectedRevision: entity.data().revision, payload: target.listId ? { listId: target.listId } : {} });
      removed++;
    }
    if (removed === 20) return { removed, more: true };
  }
  return { removed, more: false };
}
