export type GikaRequest = { requestId: string; text: string };
export type GikaResponse = { text: string; simulated: true };
export type GikaAdapter = (request: GikaRequest, signal: AbortSignal) => Promise<GikaResponse>;
export type GikaMessage = { id: string; role: 'user' | 'assistant'; text: string };
export const GIKA_MAX_INPUT = 2000;
export const GIKA_MAX_MESSAGES = 40;

// Replaced by the predictable mock in M1-T3, never a real provider in M1.
export const unavailableAdapter: GikaAdapter = async () => {
  throw new Error('Gika adapter unavailable');
};
