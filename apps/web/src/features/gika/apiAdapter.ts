import { completionEnvelope, type CompletionDescriptor } from '../../../../../packages/domain/src/gikaCompletion';
import { executeCompletion } from './completionBridge';
import { gikaInterpretationSchema } from '../../../../../packages/domain/src/gika';
import { apiRequest, ApiError } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
import { createTaskEnvelope, executeCreateTask } from './commandBridge';
import { gikaRequestSchema, gikaResponseSchema, type GikaAdapter } from './conversation';

export function createApiAdapter(): GikaAdapter {
  // One pending envelope, like conventional UI. Definitive dedup remains the transactional receipt.
  let pending: { uid: string; requestId: string; text: string; task: CompletionDescriptor } | null = null;
  return async (request, signal) => {
    const uid = firebaseAuth?.currentUser?.uid;
    const input = gikaRequestSchema.parse(request);
    const active = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    if (!uid || active.aborted) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
    if (pending && (pending.uid !== uid || pending.requestId !== input.requestId || pending.text !== input.text)) pending = null;
    const complete = async (task: CompletionDescriptor) => {
      pending = { uid, requestId: input.requestId, text: input.text, task };
      const completedTask = await executeCompletion(task, await completionEnvelope(task, input), uid, active);
      pending = null;
      return gikaResponseSchema.parse({ text: 'Tarefa concluída.', simulated: false, reads: [], completedTask });
    };
    const interpret = async () => {
      const response = gikaInterpretationSchema.parse(await apiRequest('/gika/respond', { method: 'POST', body: JSON.stringify(input), signal: active }, uid));
      if (active.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
      return response;
    };
    const execute = async (response: Awaited<ReturnType<typeof interpret>>) => {
      if (!response.createTask) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação da tarefa. Confira sua agenda.');
      return executeCreateTask(response.createTask, await createTaskEnvelope(response.createTask, input), uid, active);
    };
    const completeWithRecovery = async (task: CompletionDescriptor) => {
      try { return await complete(task); }
      catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'OPERATION_MISMATCH') throw error;
        const recovered = await interpret();
        if (!recovered.completeTask) throw error;
        return complete(recovered.completeTask);
      }
    };
    if (pending) return completeWithRecovery(pending.task);
    const response = await interpret();
    if (response.completeTask) return completeWithRecovery(response.completeTask);
    if (!response.createTask) return gikaResponseSchema.parse(response);
    let createdTask;
    try { createdTask = await execute(response); }
    catch (error) {
      // A concurrent interpretation may cross a civil-date/context boundary. Recover the committed
      // snapshot once; a different request text remains an explicit server-side mismatch.
      if (!(error instanceof ApiError) || error.code !== 'OPERATION_MISMATCH') throw error;
      createdTask = await execute(await interpret());
    }
    return gikaResponseSchema.parse({ text: 'Tarefa adicionada.', simulated: false, reads: [], createdTask });
  };
}
export const apiAdapter = createApiAdapter();
