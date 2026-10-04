import { creationUndoContextSchema, creationUndoEnvelope, creationUndoResultSchema, type CreationUndoContext } from '../../../../../packages/domain/src/gikaUndo';
import { ApiError, sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';

/** Deterministic action on an acknowledged creation. No model, reads or direct persistence. */
export async function executeCreationUndo(context: CreationUndoContext, signal: AbortSignal) {
  const input = creationUndoContextSchema.parse(context);
  function authorize() {
    if (signal.aborted) throw new ApiError(503, 'NETWORK_ERROR', 'Não recebi a confirmação. Tente desfazer novamente.');
    if (firebaseAuth?.currentUser?.uid !== input.uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na conta que adicionou essa tarefa para desfazer.');
  }
  authorize();
  const command = await creationUndoEnvelope(input);
  authorize();
  const receipt = creationUndoResultSchema.safeParse(await sendCommand(command, { signal, expectedUid: input.uid, queueOnNetworkError: false }));
  authorize();
  if (!receipt.success || receipt.data.operationId !== command.operationId || receipt.data.entityId !== input.entityId) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação. Confira sua agenda e tente desfazer novamente.');
  return receipt.data;
}
