import type { Transaction } from 'firebase-admin/firestore';
import { batchCommandFields, batchOperationId, type BatchConfirmation } from '../../packages/domain/src/gikaBatch.ts';
import type { CommandEnvelope } from '../../packages/domain/src/identity.ts';
import { recurrenceEffectSchema } from '../../packages/domain/src/gikaRecurrence.ts';
import { db } from '../platform/firebase.ts';
import { commandHash } from '../commands/identity.ts';
import { hashCanonicalValue } from '../hash.ts';
import { AppError } from '../errors.ts';
import { assertRecurrenceSnapshot } from './recurrenceGuard.ts';
const conflict = () => new AppError(409, 'REVISION_CONFLICT', 'Uma tarefa dessa prévia mudou. Confira sua agenda e faça o pedido novamente.');
/** All pending targets are read in the SAME conventional command transaction before any write. */
export async function assertBatchPending(transaction: Transaction, uid: string, command: CommandEnvelope, confirmation: BatchConfirmation) {
  const metadata = command.gikaBatch!;
  const envelopes = await Promise.all(confirmation.plan.items.map(async (item,index) => {
    if (item.operationId !== await batchOperationId(uid,metadata.requestId,index)) throw new AppError(422,'GIKA_CONFIRMATION_INVALID','Não consegui validar essa prévia. Faça o pedido novamente.');
    return { ...batchCommandFields(confirmation.plan,index), gikaBatch: { ...metadata, index } };
  }));
  const refs = confirmation.plan.items.flatMap(item => [db.doc(`commandReceipts/${uid}_${item.operationId}`),db.doc(`users/${uid}/activities/${item.id}`),...(item.recurrence ? [db.doc(`users/${uid}/series/${item.recurrence.seriesId}`)] : [])]);
  const documents = await transaction.getAll(...refs);
  let offset = 0;
  for (const [index,item] of confirmation.plan.items.entries()) {
    const receipt = documents[offset++]!, target = documents[offset++]!, series = item.recurrence ? documents[offset++]! : undefined;
    if (receipt.exists) {
      const original = receipt.data()!;
      const envelope = envelopes[index]!;
      if (original.uid !== uid || original.hash !== commandHash(envelope) || original.gikaBatch?.index !== index || hashCanonicalValue(original.gikaBatch?.confirmation) !== hashCanonicalValue(confirmation) || original.response?.entityId !== item.id || original.response?.operationId !== item.operationId || original.response?.revision !== item.revision + 1) throw conflict();
      // Original applied receipt is authoritative; subsequent edits must not be replayed/overwritten.
      continue;
    }
    if (index < metadata.index) throw new AppError(409, 'GIKA_BATCH_ORDER', 'Confirme as tarefas na ordem dessa prévia.');
    const data = target.data();
    if (!data || data.deletedAt || data.kind !== 'task' || data.status !== 'pending' || data.revision !== item.revision || data.title !== item.title || data.schedule?.type !== 'task' || data.schedule.dueDate !== item.before.dueDate || data.schedule.dueTime !== item.before.dueTime || data.schedule.timeZone !== item.timeZone) throw conflict();
    if (item.scope === 'none') { if (data.seriesId || data.occurrenceKey) throw conflict(); }
    else {
      const effect = recurrenceEffectSchema.parse({ operation:confirmation.plan.action,task:{id:item.id,title:item.title,dueDate:item.before.dueDate,dueTime:item.before.dueTime,timeZone:item.timeZone,revision:item.revision},patch:item.patch,recurrence:item.recurrence,scope:'occurrence',newSeriesId:null });
      assertRecurrenceSnapshot(effect,series?.data() ?? {},data);
    }
    if (confirmation.plan.action === 'reschedule' && 'dueDate' in item.patch && data.schedule.dueDate === item.patch.dueDate && data.schedule.dueTime === (item.patch.dueTime ?? data.schedule.dueTime)) throw new AppError(422,'GIKA_NO_CHANGE','Uma tarefa dessa prévia já está nessa data e horário. Faça o pedido novamente.');
  }
}
