import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { gikaInterpretationSchema, type CreateTaskDescriptor } from '../../../../../packages/domain/src/gika';
import { apiRequest, ApiError } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
import { createTaskEnvelope, executeCreateTask } from './commandBridge';
import { gikaRequestSchema, gikaResponseSchema, type GikaAdapter } from './conversation';

export function createApiAdapter(): GikaAdapter {
  // Same minimal pending-envelope foundation as Today. No cache/storage or new receipt system.
  let pending: { uid: string; requestId: string; text: string; task: CreateTaskDescriptor; command: CommandEnvelope } | undefined;
  return async (request, signal) => {
    const uid = firebaseAuth?.currentUser?.uid;
    const input = gikaRequestSchema.parse(request);
    const active = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    if (!uid || active.aborted) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
    if (pending && (pending.uid !== uid || pending.requestId !== input.requestId || pending.text !== input.text)) pending = undefined;
    if (!pending) {
      const response = gikaInterpretationSchema.parse(await apiRequest('/gika/respond', { method: 'POST', body: JSON.stringify(input), signal: active }));
      if (active.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
      if (!response.createTask) return gikaResponseSchema.parse(response);
      pending = { uid, requestId: input.requestId, text: input.text, task: response.createTask, command: createTaskEnvelope(response.createTask) };
    }
    const action = pending;
    const createdTask = await executeCreateTask(action.task, action.command, uid, active);
    pending = undefined;
    return gikaResponseSchema.parse({ text: 'Tarefa adicionada.', simulated: false, reads: [], createdTask });
  };
}
export const apiAdapter = createApiAdapter();
