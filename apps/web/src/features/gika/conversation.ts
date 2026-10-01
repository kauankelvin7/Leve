import type { GikaRequest, GikaResponse, ReadResult, CreatedTask } from '../../../../../packages/domain/src/gika';
export { GIKA_MAX_INPUT, GIKA_MAX_MESSAGES, gikaRequestSchema, gikaResponseSchema } from '../../../../../packages/domain/src/gika';
export type { GikaRequest, GikaResponse };
export type GikaAdapter = (request: GikaRequest, signal: AbortSignal) => Promise<GikaResponse>;
export type GikaMessage = { id: string; role: 'user' | 'assistant'; text: string; simulated?: boolean; preview?: 'organize-demo'; reads?: ReadResult[]; createdTask?: CreatedTask };
