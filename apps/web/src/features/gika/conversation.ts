import type { UpdatedTask, UpdateResolution } from '../../../../../packages/domain/src/gikaUpdate';
import type { CompletedTask, CompletionResolution } from '../../../../../packages/domain/src/gikaCompletion';
import type { CreationUndoContext } from '../../../../../packages/domain/src/gikaUndo';
import type { GikaRequest, GikaResponse, ReadResult, CreatedTask } from '../../../../../packages/domain/src/gika';
export { GIKA_MAX_INPUT, GIKA_MAX_MESSAGES, gikaRequestSchema, gikaResponseSchema } from '../../../../../packages/domain/src/gika';
export type { GikaRequest, GikaResponse };
export type GikaAdapter = (request: GikaRequest, signal: AbortSignal) => Promise<GikaResponse>;
export type GikaMessage = { id: string; role: 'user' | 'assistant'; text: string; simulated?: boolean; preview?: 'organize-demo'; reads?: ReadResult[]; createdTask?: CreatedTask; completedTask?: CompletedTask; completionResolution?: CompletionResolution; updatedTask?: UpdatedTask; updateResolution?: UpdateResolution; creationUndo?: CreationUndoContext };
