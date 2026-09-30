import { z } from 'zod';

export const GIKA_MAX_INPUT = 2000;
export const GIKA_MAX_MESSAGES = 40;
export const gikaRequestSchema = z.object({ requestId: z.uuid(), text: z.string().trim().min(1).max(GIKA_MAX_INPUT) }).strict();
export const gikaResponseSchema = z.object({ text: z.string().trim().min(1).max(1000), simulated: z.literal(true), preview: z.literal('organize-demo').optional() }).strict();
export type GikaRequest = z.infer<typeof gikaRequestSchema>;
export type GikaResponse = z.infer<typeof gikaResponseSchema>;
export type GikaAdapter = (request: GikaRequest, signal: AbortSignal) => Promise<GikaResponse>;
export type GikaMessage = { id: string; role: 'user' | 'assistant'; text: string; preview?: GikaResponse['preview'] };
