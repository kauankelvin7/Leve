import { describe, expect, it } from 'vitest';
import { redactLogText, serializeBackendError } from '../../server/logger.ts';

describe('logs do backend', () => {
  it('remove credenciais, e-mails e chaves antes de registrar', () => {
    const input = 'Bearer token.secreto usuario@example.test AIzaSy123456789012345678901234567890';
    const output = redactLogText(input);
    expect(output).not.toContain('token.secreto');
    expect(output).not.toContain('usuario@example.test');
    expect(output).not.toContain('AIzaSy123456789012345678901234567890');
    expect(output).toContain('[REDACTED');
  });

  it('preserva diagnóstico técnico e causa somente na serialização interna', () => {
    const firebaseError = Object.assign(new Error('Falha para usuario@example.test'), { code: 'auth/id-token-expired' });
    const error = new Error('Falha de autenticação', { cause: firebaseError });
    const serialized = serializeBackendError(error);
    expect(serialized.message).toBe('Falha de autenticação');
    expect(serialized.cause).toMatchObject({ code: 'auth/id-token-expired', message: 'Falha para [REDACTED_EMAIL]' });
  });
});
