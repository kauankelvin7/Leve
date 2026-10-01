import { gikaConfirmationSchema, type GikaConfirmation } from '../../../../../packages/domain/src/gikaConfirmation';
import { rescheduleEnvelope } from '../../../../../packages/domain/src/gikaReschedule';
import { ApiError, apiRequest } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
import { executeReschedule } from './rescheduleBridge';

export async function confirmGikaAction(value: GikaConfirmation, request: { requestId: string; text: string }, uid: string, signal: AbortSignal) {
  const confirmation = gikaConfirmationSchema.parse(value);
  const execute = async (current: GikaConfirmation) => {
    if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
    const task = current.action.task;
    return executeReschedule(task, await rescheduleEnvelope(task, request, current.token), uid, signal);
  };
  try { return await execute(confirmation); }
  catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'OPERATION_MISMATCH') throw error;
    if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
    // Only a committed receipt may replace a raced descriptor. No model/target resolution/renewal.
    const recovered = gikaConfirmationSchema.parse(await apiRequest('/gika/recover-confirmation', { method: 'POST', body: JSON.stringify(request), signal }, uid));
    return execute(recovered);
  }
}
