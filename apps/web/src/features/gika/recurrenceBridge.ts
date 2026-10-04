import { z } from 'zod';
import { recurrenceChoiceSchema, recurrenceConfirmationSchema, recurrenceEnvelope, recurrenceApplied, type RecurrenceChoice, type RecurrenceConfirmation } from '../../../../../packages/domain/src/gikaRecurrence';
import { completionResultSchema } from '../../../../../packages/domain/src/gikaCompletion';
import { ApiError, apiRequest, sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';

function authorize(uid: string, signal: AbortSignal) {
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na conta que fez esse pedido para continuar.');
}
export async function chooseGikaRecurrence(value: RecurrenceChoice, scope: 'occurrence' | 'future', request: { requestId: string; text: string }, uid: string, signal: AbortSignal) {
  const choice = recurrenceChoiceSchema.parse(value);
  if (!choice.options.includes(scope)) throw new ApiError(422, 'GIKA_CONFIRMATION_INVALID', 'Escolha uma opção disponível para essa rotina.');
  authorize(uid, signal);
  const response = z.object({ confirmation: recurrenceConfirmationSchema }).strict().parse(await apiRequest('/gika/choose-recurrence', { method: 'POST', body: JSON.stringify({ ...request, token: choice.token, scope }), signal }, uid));
  authorize(uid, signal);
  const effect = response.confirmation.effect;
  const proposal = { task: effect.task, recurrence: effect.recurrence, operation: effect.operation, patch: effect.patch };
  if (effect.scope !== scope || JSON.stringify(proposal) !== JSON.stringify(choice.proposal)) throw new ApiError(422, 'GIKA_CONFIRMATION_INVALID', 'Não consegui confirmar essa prévia. Faça o pedido novamente.');
  return response.confirmation;
}
export async function confirmGikaRecurrence(value: RecurrenceConfirmation, request: { requestId: string; text: string }, uid: string, signal: AbortSignal) {
  const confirmation = recurrenceConfirmationSchema.parse(value);
  const execute = async (current: RecurrenceConfirmation) => {
    authorize(uid, signal);
    const command = await recurrenceEnvelope(current.effect, request, current.token);
    authorize(uid, signal);
    const ack = completionResultSchema.parse(await sendCommand(command, { signal, expectedUid: uid, queueOnNetworkError: false }));
    authorize(uid, signal);
    if (ack.operationId !== command.operationId) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação. Confira sua agenda.');
    try { return recurrenceApplied(current.effect, ack); }
    catch { throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação. Confira sua agenda.'); }
  };
  try { return await execute(confirmation); }
  catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'OPERATION_MISMATCH') throw error;
    authorize(uid, signal);
    // Only the original committed receipt can replace a raced preview; never call the model.
    const recovered = z.object({ recurrenceConfirmation: recurrenceConfirmationSchema }).strict().safeParse(await apiRequest('/gika/recover-confirmation', { method: 'POST', body: JSON.stringify(request), signal }, uid));
    if (!recovered.success) throw new ApiError(422, 'GIKA_CONFIRMATION_INVALID', 'Não consegui confirmar essa prévia. Faça o pedido novamente.');
    const original = confirmation.effect, effect = recovered.data.recurrenceConfirmation.effect;
    if (effect.scope !== original.scope || effect.operation !== original.operation || effect.task.id !== original.task.id) throw new ApiError(422, 'GIKA_CONFIRMATION_INVALID', 'Não consegui confirmar essa prévia. Faça o pedido novamente.');
    return execute(recovered.data.recurrenceConfirmation);
  }
}
