import { batchConfirmationSchema, batchEnvelope, batchOperationId, batchResult, type BatchConfirmation, type BatchResult } from '../../../../../packages/domain/src/gikaBatch';
import { completionResultSchema } from '../../../../../packages/domain/src/gikaCompletion';
import { ApiError, apiRequest, sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';

function authorize(uid: string) {
  if (firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na conta que fez esse pedido para continuar.');
}
export class BatchInterruptedError extends ApiError {
  constructor(error: ApiError, public result: BatchResult) { super(error.status, error.code, error.message); }
}
const invalid = () => new ApiError(422, 'GIKA_CONFIRMATION_INVALID', 'Não consegui validar essa prévia. Faça o pedido novamente.');

/** Bounded sequential composition of conventional commands; each result requires its own real ack. */
export async function confirmGikaBatch(value: BatchConfirmation, request: { requestId: string; text: string }, uid: string, signal: AbortSignal): Promise<BatchResult> {
  let confirmation: BatchConfirmation;
  try { confirmation = batchConfirmationSchema.parse(value); } catch { throw invalid(); }
  authorize(uid);
  // Operation identity belongs to software, not a rendered label or a model-supplied ID.
  for (const [index, item] of confirmation.plan.items.entries()) {
    if (item.operationId !== await batchOperationId(uid, request.requestId, index)) throw invalid();
    authorize(uid);
  }
  const statuses: BatchResult['items'] = confirmation.plan.items.map(item => ({ id: item.id, title: item.title, status: 'pending' }));
  for (const [index, item] of confirmation.plan.items.entries()) {
    authorize(uid);
    let command = await batchEnvelope(confirmation, request, index);
    authorize(uid);
    try {
      signal.throwIfAborted();
      let raw;
      try { raw = await sendCommand(command, { queueOnNetworkError: false, expectedUid: uid, signal }); }
      catch (error) {
        authorize(uid);
        if (!(error instanceof ApiError) || error.code !== 'OPERATION_MISMATCH' || signal.aborted) throw error;
        // Committed receipts may recover the original token; they cannot substitute another plan.
        const recoveredResponse = await apiRequest<{ confirmation: unknown }>('/gika/recover-batch', { method: 'POST', body: JSON.stringify(request), signal }, uid);
        let recovered: BatchConfirmation;
        try { recovered = batchConfirmationSchema.parse(recoveredResponse.confirmation); } catch { throw invalid(); }
        authorize(uid);
        if (JSON.stringify(recovered.plan) !== JSON.stringify(confirmation.plan)) throw invalid();
        confirmation = recovered;
        command = await batchEnvelope(confirmation, request, index);
        authorize(uid); signal.throwIfAborted();
        raw = await sendCommand(command, { queueOnNetworkError: false, expectedUid: uid, signal });
      }
      authorize(uid);
      const ack = completionResultSchema.safeParse(raw);
      if (!ack.success || ack.data.operationId !== item.operationId || ack.data.entityId !== item.id || ack.data.revision !== item.revision + 1) {
        statuses[index] = { id: item.id, title: item.title, status: 'unknown' }; break;
      }
      statuses[index] = { id: item.id, title: item.title, status: ack.data.result, revision: ack.data.revision };
    } catch (error) {
      authorize(uid);
      const code = error instanceof ApiError ? error.code : '';
      if (['AUTH_REQUIRED', 'FORBIDDEN', 'EMAIL_UNVERIFIED'].includes(code)) throw error;
      if (['GIKA_CONFIRMATION_INVALID', 'GIKA_CONFIRMATION_EXPIRED', 'OPERATION_MISMATCH'].includes(code)) {
        if (error instanceof ApiError && statuses.some(item => item.status === 'applied' || item.status === 'alreadyApplied')) {
          statuses[index] = { id: item.id, title: item.title, status: 'failed' };
          throw new BatchInterruptedError(error, batchResult(statuses));
        }
        throw error;
      }
      const conflict = ['REVISION_CONFLICT', 'GIKA_BATCH_CONFLICT', 'ENTITY_UNAVAILABLE', 'ENTITY_DELETED'].includes(code);
      // A transport/5xx failure may follow commit. Never call that a proven failed write.
      const definitive = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408;
      statuses[index] = { id: item.id, title: item.title, status: conflict ? 'conflict' : definitive ? 'failed' : 'unknown' };
      break;
    }
  }
  authorize(uid);
  return batchResult(statuses);
}
