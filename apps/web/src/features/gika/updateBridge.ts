import { commandEnvelopeSchema, type CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { updateDescriptorSchema, updateTaskPatchSchema, updatedTaskSchema, type UpdateDescriptor } from '../../../../../packages/domain/src/gikaUpdate';
import { completionResultSchema } from '../../../../../packages/domain/src/gikaCompletion';
import { ApiError, sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
export async function executeUpdate(task: UpdateDescriptor, command: CommandEnvelope, uid: string, signal: AbortSignal) {
  updateDescriptorSchema.parse(task); commandEnvelopeSchema.parse(command);
  const patch = updateTaskPatchSchema.parse(command.payload);
  if (!command.gikaUpdate || command.command !== 'activity.update' || command.entityId !== task.id || command.expectedRevision !== task.revision
    || patch.title !== task.patch.title || JSON.stringify(command.payload) !== JSON.stringify(patch)) throw new ApiError(422, 'GIKA_INVALID_RESPONSE', 'Confira os dados da tarefa.');
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  let result;
  try { result = await sendCommand(command, { signal, expectedUid: uid, queueOnNetworkError: false }); }
  catch (error) {
    if (error instanceof ApiError && error.code === 'REVISION_CONFLICT') throw new ApiError(409, 'GIKA_UPDATE_CONFLICT', 'Essa tarefa mudou enquanto você estava editando. Faça o pedido novamente.');
    throw error;
  }
  const ack = completionResultSchema.parse(result);
  if (ack.operationId !== command.operationId || ack.entityId !== task.id || ack.revision !== task.revision + 1) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação. Confira sua agenda.');
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  return updatedTaskSchema.parse({ id: task.id, title: task.patch.title, dueDate: task.dueDate, timeZone: task.timeZone, revision: ack.revision, result: ack.result });
}
