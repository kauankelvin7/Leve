import { gikaInterpretationSchema } from '../../../../../packages/domain/src/gika';
import { apiRequest, ApiError } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
import { createTaskEnvelope, executeCreateTask } from './commandBridge';
import { gikaRequestSchema, gikaResponseSchema, type GikaAdapter } from './conversation';

export function createApiAdapter(): GikaAdapter {
  return async (request, signal) => {
    const uid = firebaseAuth?.currentUser?.uid;
    const input = gikaRequestSchema.parse(request);
    const active = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    if (!uid || active.aborted) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
    const interpret = async () => {
      const response = gikaInterpretationSchema.parse(await apiRequest('/gika/respond', { method: 'POST', body: JSON.stringify(input), signal: active }, uid));
      if (active.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
      return response;
    };
    const execute = async (response: Awaited<ReturnType<typeof interpret>>) => {
      if (!response.createTask) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação da tarefa. Confira sua agenda.');
      return executeCreateTask(response.createTask, await createTaskEnvelope(response.createTask, input), uid, active);
    };
    const response = await interpret();
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
