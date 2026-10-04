import { describe, expect, it, vi } from 'vitest';
import { backendLog, latencyBucket, technicalRoute, redactLogText, serializeBackendError } from '../../server/logger.ts';

describe('logs do backend', () => {
  it('remove credenciais, e-mails e chaves antes de registrar', () => {
    const input = 'Bearer token.secreto usuario@example.test AIzaSy123456789012345678901234567890';
    const output = redactLogText(input);
    expect(output).not.toContain('token.secreto');
    expect(output).not.toContain('usuario@example.test');
    expect(output).not.toContain('AIzaSy123456789012345678901234567890');
    expect(output).toContain('[REDACTED');
  });

  it('preserva classe/código técnico sem mensagens privadas ou stack', () => {
    const firebaseError = Object.assign(new Error('Falha para usuario@example.test'), { code: 'auth/id-token-expired' });
    const error = new Error('Falha de autenticação', { cause: firebaseError });
    const serialized = serializeBackendError(error);
    expect(serialized).not.toHaveProperty('message');
    expect(serialized).not.toHaveProperty('stack');
    expect(serialized.cause).toMatchObject({ name: 'Error', code: 'auth/id-token-expired' });
  });
});

it('does not log free-form private content from parser errors or nested causes', () => {
  const privateText = 'Synthetic private agenda text';
  const error = new SyntaxError(privateText, { cause: new Error(privateText) });
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    backendLog('warn', 'request.invalid_json', { status: 400 }, error);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(privateText);
    expect(serializeBackendError(error)).toMatchObject({ name: 'SyntaxError' });
  } finally { warn.mockRestore(); }
});

it('normalizes paths and latency without private IDs or unknown route contents', () => {
  expect(technicalRoute('/api/commands/private-operation')).toBe('/api/commands/:operationId');
  expect(technicalRoute('/api/private-title')).toBe('unknown');
  expect(technicalRoute('/api/gika/respond')).toBe('/api/gika/respond');
  expect([99, 100, 999, 1000, 4999, 5000].map(latencyBucket)).toEqual(['lt_100ms', '100_999ms', '100_999ms', '1_4s', '1_4s', 'gte_5s']);
});
