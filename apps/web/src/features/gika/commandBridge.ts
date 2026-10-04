import { activityInputSchema } from '../../../../../packages/domain/src/content';
import { commandEnvelopeSchema, type CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { commandCreationResultSchema, createdTaskSchema, createTaskDescriptorSchema, gikaRequestSchema, taskActivityInput, type CreateTaskDescriptor, type GikaRequest } from '../../../../../packages/domain/src/gika';
import { ApiError, sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
export async function createTaskEnvelope(descriptor: CreateTaskDescriptor, request: GikaRequest): Promise<CommandEnvelope> {
  const task = createTaskDescriptorSchema.parse(descriptor);
  const input = gikaRequestSchema.parse(request);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.text));
  const requestTextHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  // Stable across clients/processes. UID namespace and atomic dedup are owned by the existing command layer.
  return commandEnvelopeSchema.parse({ command: 'activity.create', operationId: input.requestId, entityId: input.requestId, expectedRevision: 0,
    gika: { requestTextHash }, payload: activityInputSchema.parse(taskActivityInput(task)) });
}
export async function executeCreateTask(task: CreateTaskDescriptor, command: CommandEnvelope, uid: string, signal: AbortSignal) {
  createTaskDescriptorSchema.parse(task); commandEnvelopeSchema.parse(command);
  if (!command.gika || command.command !== 'activity.create' || command.expectedRevision !== 0
    || JSON.stringify(activityInputSchema.parse(command.payload)) !== JSON.stringify(activityInputSchema.parse(taskActivityInput(task)))) {
    throw new ApiError(422, 'GIKA_INVALID_RESPONSE', 'Confira os dados da tarefa e tente novamente.');
  }
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  const receipt = commandCreationResultSchema.parse(await sendCommand(command, { signal, expectedUid: uid, queueOnNetworkError: false }));
  if (receipt.operationId !== command.operationId || receipt.entityId !== command.entityId) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação da tarefa. Confira sua agenda.');
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  return createdTaskSchema.parse({ ...task, id: receipt.entityId, revision: receipt.revision, result: receipt.result });
}
