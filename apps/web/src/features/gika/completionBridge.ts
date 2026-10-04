import { commandEnvelopeSchema, type CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { completionDescriptorSchema, completionResultSchema, completedTaskSchema, type CompletionDescriptor } from '../../../../../packages/domain/src/gikaCompletion';
import { ApiError, sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
export async function executeCompletion(task: CompletionDescriptor, command: CommandEnvelope, uid: string, signal: AbortSignal) {
  completionDescriptorSchema.parse(task); commandEnvelopeSchema.parse(command);
  if (!command.gikaCompletion || command.command !== 'activity.setStatus' || command.entityId !== task.id || command.expectedRevision !== task.revision
    || JSON.stringify(command.payload) !== JSON.stringify({ status: 'completed' })) throw new ApiError(422, 'GIKA_INVALID_RESPONSE', 'Confira os dados da tarefa.');
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  const ack = completionResultSchema.parse(await sendCommand(command, { signal, expectedUid: uid, queueOnNetworkError: false }));
  if (ack.operationId !== command.operationId || ack.entityId !== task.id || ack.revision !== task.revision + 1) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação. Confira sua agenda.');
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  return completedTaskSchema.parse({ ...task, revision: ack.revision, result: ack.result });
}
