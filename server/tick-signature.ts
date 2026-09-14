import { createHmac, timingSafeEqual } from 'node:crypto';

export const TICK_PATH = '/api/internal/tick';

export function tickSignature(secret: string, timestamp: string) {
  return createHmac('sha256', secret).update(`${timestamp}.POST.${TICK_PATH}`).digest('hex');
}

export function validTickSignature(secret: string, timestamp: string, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(tickSignature(secret, timestamp), 'hex'), Buffer.from(signature, 'hex'));
}
