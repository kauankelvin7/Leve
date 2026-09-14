import { describe, expect, it } from 'vitest';
import { tickSignature, validTickSignature } from '../../server/tick-signature.ts';

describe('assinatura do tick agendado', () => {
  it('vincula segredo, timestamp, método e rota do tick', () => {
    const secret = 'segredo-local';
    const timestamp = '1789228800000';
    const signature = tickSignature(secret, timestamp);
    expect(validTickSignature(secret, timestamp, signature)).toBe(true);
    expect(validTickSignature(secret, String(Number(timestamp) + 1), signature)).toBe(false);
    expect(validTickSignature('outro-segredo', timestamp, signature)).toBe(false);
    expect(validTickSignature(secret, timestamp, signature.slice(0, -1))).toBe(false);
  });
});
