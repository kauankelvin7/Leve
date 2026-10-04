import { afterEach, describe, expect, it, vi } from 'vitest';
import { gikaDiagnostic, safeGikaError } from '../../server/gika/diagnostics.ts';
import { GikaFault } from '../../server/gika/model.ts';

const correlationId = '25d826a4-045f-45c7-9884-d141aceb06d5';
const model = 'gemini-3.5-flash-lite';

afterEach(() => vi.restoreAllMocks());

describe('sanitized Gika diagnostics', () => {
  it('keeps only technical metadata when a request starts', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const context = {
      correlationId, model, apiKeyPresent: true,
      text: 'PRIVATE_USER_TEXT', payload: { agenda: 'PRIVATE_AGENDA' },
      apiKey: 'PRIVATE_API_KEY', token: 'PRIVATE_TOKEN',
    };

    gikaDiagnostic('request_started', context);

    expect(info).toHaveBeenCalledTimes(1);
    expect(JSON.parse(info.mock.calls[0]![0] as string)).toEqual({
      timestamp: expect.any(String), level: 'info', service: 'leve-backend',
      event: 'gika.diagnostic', stage: 'request_started', correlationId, model,
      keyPresent: true,
    });
    expect(JSON.stringify(info.mock.calls)).not.toContain('PRIVATE');
  });

  it('reports the actual upstream status without provider body or payload', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const context = {
      correlationId, model, upstreamStatus: 503,
      body: 'PRIVATE_PROVIDER_BODY', payload: 'PRIVATE_PAYLOAD',
    };

    gikaDiagnostic('upstream_response', context);

    expect(info).toHaveBeenCalledTimes(1);
    expect(JSON.parse(info.mock.calls[0]![0] as string)).toEqual({
      timestamp: expect.any(String), level: 'info', service: 'leve-backend',
      event: 'gika.upstream.response', stage: 'upstream_response',
      correlationId, model, upstreamStatus: 503,
    });
    expect(JSON.stringify(info.mock.calls)).not.toContain('PRIVATE');
  });

  it('logs a fetch exception with safe classes and no invented upstream status', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cause = Object.assign(new Error('PRIVATE_CAUSE_MESSAGE'), {
      name: 'PRIVATE_CAUSE_NAME', stack: 'PRIVATE_CAUSE_STACK', code: 'ENOTFOUND',
      payload: { secret: 'PRIVATE_CAUSE_PAYLOAD' },
    });
    const error = Object.assign(new TypeError('PRIVATE_ERROR_MESSAGE', { cause }), {
      name: 'PRIVATE_ERROR_NAME', stack: 'PRIVATE_ERROR_STACK', code: 'PRIVATE_CODE',
      payload: { agenda: 'PRIVATE_ERROR_PAYLOAD' },
    });

    gikaDiagnostic('fetch_exception', { correlationId, model, error });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warn.mock.calls[0]![0] as string)).toEqual({
      timestamp: expect.any(String), level: 'warn', service: 'leve-backend',
      event: 'gika.diagnostic', stage: 'fetch_exception', correlationId, model,
      errorClass: 'TypeError', causeClass: 'DnsResolutionError',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('PRIVATE');
  });

  it('identifies missing service controls before the model without an upstream status', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = new GikaFault('GIKA_UNAVAILABLE', 'ServiceControlsMissing');

    gikaDiagnostic('authorization', { correlationId, model, error });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warn.mock.calls[0]![0] as string)).toEqual({
      timestamp: expect.any(String), level: 'warn', service: 'leve-backend',
      event: 'gika.diagnostic', stage: 'authorization', correlationId, model,
      errorClass: 'ServiceControlsMissing',
    });
  });

  it('does not treat arbitrary names and codes as technical classifications', () => {
    const cause = Object.assign(new Error('PRIVATE_CAUSE_MESSAGE'), {
      name: 'PRIVATE_CAUSE_NAME', code: 'PRIVATE_CAUSE_CODE', stack: 'PRIVATE_CAUSE_STACK',
    });
    const error = Object.assign(new Error('PRIVATE_MESSAGE', { cause }), {
      name: 'PRIVATE_NAME', code: 'PRIVATE_CODE', stack: 'PRIVATE_STACK',
    });

    expect(safeGikaError(error)).toEqual({ errorClass: 'Error', causeClass: 'Error' });
    expect(JSON.stringify(safeGikaError(error))).not.toContain('PRIVATE');
    expect(safeGikaError(Object.assign(new Error('PRIVATE_MESSAGE'), { name: 'TypeError' })))
      .toEqual({ errorClass: 'Error' });
    expect(safeGikaError({ name: 'PRIVATE_NAME', code: 'PRIVATE_CODE', message: 'PRIVATE_MESSAGE' }))
      .toEqual({ errorClass: 'Error' });
  });

  it.each([
    ['TypeError', new TypeError('PRIVATE_MESSAGE')],
    ['SyntaxError', new SyntaxError('PRIVATE_MESSAGE')],
    ['RangeError', new RangeError('PRIVATE_MESSAGE')],
    ['AbortError', new DOMException('PRIVATE_MESSAGE', 'AbortError')],
    ['TimeoutError', new DOMException('PRIVATE_MESSAGE', 'TimeoutError')],
  ])('preserves the allowed %s class without its private message', (errorClass, error) => {
    expect(safeGikaError(error)).toEqual({ errorClass });
    expect(JSON.stringify(safeGikaError(error))).not.toContain('PRIVATE');
  });

  it.each([
    ['ENOTFOUND', 'DnsResolutionError'],
    ['CERT_HAS_EXPIRED', 'TlsError'],
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'TlsError'],
    ['ECONNREFUSED', 'ConnectionRefusedError'],
  ])('classifies the allowed cause code %s without copying it or its message', (code, causeClass) => {
    const cause = Object.assign(new Error('PRIVATE_CAUSE_MESSAGE'), {
      code, name: 'PRIVATE_CAUSE_NAME', stack: 'PRIVATE_CAUSE_STACK',
    });
    const error = new TypeError('PRIVATE_MESSAGE', { cause });

    expect(safeGikaError(error)).toEqual({ errorClass: 'TypeError', causeClass });
    expect(JSON.stringify(safeGikaError(error))).not.toContain('PRIVATE');
    expect(safeGikaError(error)).not.toHaveProperty('code');
  });
});
