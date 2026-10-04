import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelInput } from '../../server/gika/model';
import { createGeminiAdapter, geminiPayload, GEMINI_ENDPOINT, parseGeminiResponse } from '../../server/gika/gemini';
const input = { text: 'O que tenho hoje?', context: { today: '2026-09-30', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const } };
const signal = () => new AbortController().signal;
const body = (parts: unknown[], finishReason = 'STOP') => ({ candidates: [{ finishReason, content: { parts } }] });
const correlationId = '25d826a4-045f-45c7-9884-d141aceb06d5';
function captureDiagnostics() {
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  return () => [...info.mock.calls, ...warn.mock.calls]
    .map(([line]) => JSON.parse(line as string) as Record<string, unknown>);
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('Gemini Developer adapter, sem credenciais fictícias', () => {
  it('fixa modelo, medium e registro fechado de tools atuais', () => {
    const payload = geminiPayload(input);
    expect(GEMINI_ENDPOINT).toContain('gemini-3.5-flash-lite:generateContent');
    expect(payload.generationConfig.thinkingConfig.thinkingLevel).toBe('MEDIUM');
    expect(payload.tools[0]!.functionDeclarations.map(tool => tool.name)).toEqual(['respond_conversation', 'batch_complete', 'batch_reschedule', 'get_today', 'get_day', 'create_task', 'complete_task', 'update_task', 'reschedule_task', 'get_week']);
    expect(payload.tools[0]!.functionDeclarations.find(tool => tool.name === 'update_task')?.parametersJsonSchema).toMatchObject({ additionalProperties: false, required: ['title', 'date', 'patch'], properties: { patch: { additionalProperties: false, required: ['title'] } } });
    expect(payload.tools[0]!.functionDeclarations.find(tool => tool.name === 'create_task')?.parametersJsonSchema).toMatchObject({ additionalProperties: false, required: ['title', 'dueDate', 'dueTime'] });
    for (const name of ['batch_complete', 'batch_reschedule']) {
      const declaration = payload.tools[0]!.functionDeclarations.find(tool => tool.name === name)?.parametersJsonSchema;
      expect(declaration).toMatchObject({ additionalProperties: false, properties: { excludeTitles: { maxItems: 5 } } });
      for (const field of ['uid', 'entityId', 'revision', 'operationId']) expect(declaration!.properties).not.toHaveProperty(field);
    }
    expect(payload.contents[0]!.parts).toEqual([{ text: input.text }]);
  });
  it.each([
    ['normal', input],
    ['organization', { ...input, planning: { startDate: input.context.today, endDate: input.context.today, tasks: [] } }],
  ] satisfies [string, ModelInput][])('Gemini 3.x %s omits unsupported candidate counts', (_flow, value) => {
    const payload = geminiPayload(value);
    expect(payload.generationConfig).not.toHaveProperty('candidateCount');
    expect(payload.generationConfig).not.toHaveProperty('candidate_count');
    expect(payload.generationConfig.thinkingConfig.thinkingLevel).toBe('MEDIUM');
    expect(GEMINI_ENDPOINT).toContain('gemini-3.5-flash-lite:generateContent');
  });
  it.each([200, 400, 403, 429, 503])('logs only technical upstream context for HTTP %s', async status => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const correlationId = 'a8dc363c-05f5-49b0-a40c-9c6637825743';
    const http = vi.fn(async () => status === 200
      ? Response.json(body([{ functionCall: { name: 'get_today', args: {} } }]))
      : new Response('PRIVATE_PROVIDER_BODY Authorization: Bearer PRIVATE_SECRET', { status }));
    const adapter = createGeminiAdapter(http);
    await adapter.interpret({ ...input, text: 'PRIVATE_USER_TEXT' }, signal(), { correlationId }).catch(() => undefined);
    const upstream = log.mock.calls.map(([line]) => JSON.parse(line as string))
      .filter(record => record.event === 'gika.upstream.response');
    expect(upstream).toEqual([{ timestamp: expect.any(String), level: 'info', service: 'leve-backend',
      event: 'gika.upstream.response', stage: 'upstream_response', upstreamStatus: status, correlationId, model: 'gemini-3.5-flash-lite' }]);
    expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE_');
    expect(JSON.stringify(http.mock.calls[0])).not.toContain(correlationId);
  });
  it.each([
    ['missing key', '', 'GIKA_NOT_CONFIGURED', false, 'GikaFault'],
    ['invalid header', 'PRIVATE_KEY\nPRIVATE_VALUE', 'GIKA_UNAVAILABLE', true, 'TypeError'],
    ['non-byte header', 'PRIVATE_KEY_\u2603', 'GIKA_UNAVAILABLE', true, 'TypeError'],
  ])('logs %s as config_error before any fetch', async (_case, key, code, keyPresent, errorClass) => {
    const records = captureDiagnostics();
    vi.stubEnv('GEMINI_API_KEY', key);
    const http = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body([])));

    await expect(createGeminiAdapter().interpret({ ...input, text: 'PRIVATE_USER_TEXT' }, signal(), { correlationId }))
      .rejects.toMatchObject({ code });

    expect(http).not.toHaveBeenCalled();
    expect(records().filter(record => record.level === 'warn')).toEqual([{
      timestamp: expect.any(String), level: 'warn', service: 'leve-backend',
      event: 'gika.diagnostic', stage: 'config_error', correlationId,
      model: 'gemini-3.5-flash-lite', keyPresent, errorClass,
    }]);
    expect(records().some(record => record.stage === 'request_started' || record.event === 'gika.upstream.response')).toBe(false);
    expect(records().every(record => !Object.hasOwn(record, 'upstreamStatus'))).toBe(true);
    expect(JSON.stringify(records())).not.toContain('PRIVATE');
  });
  it('logs a default-transport network failure with safe classes and no upstream status', async () => {
    const records = captureDiagnostics();
    vi.stubEnv('GEMINI_API_KEY', 'PRIVATE_TEST_KEY');
    const cause = Object.assign(new Error('PRIVATE_CAUSE_MESSAGE'), {
      name: 'PRIVATE_CAUSE_NAME', stack: 'PRIVATE_CAUSE_STACK', code: 'ENOTFOUND',
    });
    const error = Object.assign(new TypeError('PRIVATE_ERROR_MESSAGE', { cause }), {
      name: 'PRIVATE_ERROR_NAME', stack: 'PRIVATE_ERROR_STACK', payload: 'PRIVATE_PAYLOAD',
    });
    const http = vi.spyOn(globalThis, 'fetch').mockRejectedValue(error);

    const failure = await createGeminiAdapter().interpret({ ...input, text: 'PRIVATE_USER_TEXT' }, signal(), { correlationId })
      .catch(error => error);

    expect(failure).toMatchObject({ code: 'GIKA_UNAVAILABLE' });
    expect(failure).not.toHaveProperty('cause');
    expect(http).toHaveBeenCalledTimes(1);
    expect(records().map(record => record.stage)).toEqual(['payload', 'request_started', 'fetch_exception']);
    expect(records().filter(record => record.level === 'warn')).toEqual([{
      timestamp: expect.any(String), level: 'warn', service: 'leve-backend',
      event: 'gika.diagnostic', stage: 'fetch_exception', correlationId,
      model: 'gemini-3.5-flash-lite', keyPresent: true,
      errorClass: 'TypeError', causeClass: 'DnsResolutionError',
    }]);
    expect(records().every(record => !Object.hasOwn(record, 'upstreamStatus'))).toBe(true);
    expect(JSON.stringify(records())).not.toContain('PRIVATE');
  });
  it('logs timeout when the default fetch ignores cancellation without inventing an upstream status', async () => {
    const records = captureDiagnostics();
    vi.stubEnv('GEMINI_API_KEY', 'PRIVATE_TEST_KEY');
    const http = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => undefined));

    await expect(createGeminiAdapter(undefined, 5).interpret({ ...input, text: 'PRIVATE_USER_TEXT' }, signal(), { correlationId }))
      .rejects.toMatchObject({ code: 'GIKA_TIMEOUT' });

    expect(http).toHaveBeenCalledTimes(1);
    expect(records().map(record => record.stage)).toEqual(['payload', 'request_started', 'timeout']);
    expect(records().filter(record => record.level === 'warn')).toEqual([{
      timestamp: expect.any(String), level: 'warn', service: 'leve-backend',
      event: 'gika.diagnostic', stage: 'timeout', correlationId,
      model: 'gemini-3.5-flash-lite', keyPresent: true, errorClass: 'GikaFault',
    }]);
    expect(records().every(record => !Object.hasOwn(record, 'upstreamStatus'))).toBe(true);
    expect(JSON.stringify(records())).not.toContain('PRIVATE');
  });
  it('logs exactly one timeout when fetch rejects after the deadline has already won', async () => {
    const records = captureDiagnostics();
    vi.stubEnv('GEMINI_API_KEY', 'PRIVATE_TEST_KEY');
    let rejectFetch!: (reason: unknown) => void;
    const deferred = new Promise<Response>((_resolve, reject) => { rejectFetch = reject; });
    const http = vi.spyOn(globalThis, 'fetch').mockReturnValue(deferred);

    await expect(createGeminiAdapter(undefined, 5).interpret(input, signal(), { correlationId }))
      .rejects.toMatchObject({ code: 'GIKA_TIMEOUT' });

    rejectFetch(new DOMException('PRIVATE_LATE_ABORT_MESSAGE', 'AbortError'));
    // Drain the late transport rejection and its nested async catch before checking diagnostics.
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(http).toHaveBeenCalledTimes(1);
    expect(records().filter(record => record.level === 'warn')).toEqual([{
      timestamp: expect.any(String), level: 'warn', service: 'leve-backend',
      event: 'gika.diagnostic', stage: 'timeout', correlationId,
      model: 'gemini-3.5-flash-lite', keyPresent: true, errorClass: 'GikaFault',
    }]);
    expect(records().filter(record => record.stage === 'timeout')).toHaveLength(1);
    expect(records().every(record => !Object.hasOwn(record, 'upstreamStatus'))).toBe(true);
    expect(JSON.stringify(records())).not.toContain('PRIVATE');
  });
  it.each([
    ['PRIVATE_INVALID_JSON', 'GIKA_INVALID_RESPONSE', 'SyntaxError'],
    [JSON.stringify(body([{ functionCall: { name: 'get_day', args: 'PRIVATE_INVALID_ARGS' } }])), 'GIKA_MALFORMED_CALL', 'GikaFault'],
  ])('logs parse_error after an actual upstream response without private provider content', async (providerBody, code, errorClass) => {
    const records = captureDiagnostics();
    vi.stubEnv('GEMINI_API_KEY', 'PRIVATE_TEST_KEY');
    const http = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(providerBody, { status: 200 }));

    await expect(createGeminiAdapter().interpret({ ...input, text: 'PRIVATE_USER_TEXT' }, signal(), { correlationId }))
      .rejects.toMatchObject({ code });

    expect(http).toHaveBeenCalledTimes(1);
    expect(records().map(record => record.stage)).toEqual(['payload', 'request_started', 'upstream_response', 'parse_error']);
    expect(records().filter(record => record.level === 'warn')).toEqual([{
      timestamp: expect.any(String), level: 'warn', service: 'leve-backend',
      event: 'gika.diagnostic', stage: 'parse_error', correlationId,
      model: 'gemini-3.5-flash-lite', keyPresent: true,
      upstreamStatus: 200, errorClass,
    }]);
    expect(records().filter(record => record.event === 'gika.upstream.response')).toHaveLength(1);
    expect(JSON.stringify(records())).not.toContain('PRIVATE');
  });
  it('normaliza tool call e ignora narrativa sem ferramentas', () => {
    expect(parseGeminiResponse(body([{ functionCall: { name: 'get_today', args: {} }, thoughtSignature: 'opaque' }]))).toEqual([{ name: 'get_today', args: {} }]);
    expect(parseGeminiResponse(body([{ text: 'Tarefa criada!' }]))).toEqual([]);
    expect(parseGeminiResponse(body([{ functionCall: { name: 'get_today', id: 'provider-call' } }]))).toEqual([{ name: 'get_today', args: {} }]);
  });
  it.each([[429, 'GIKA_QUOTA'], [503, 'GIKA_UNAVAILABLE'], [403, 'GIKA_UNAVAILABLE']])('HTTP %s não tenta outro modelo/retry', async (status, code) => {
    const http = vi.fn(async () => new Response('private upstream details', { status: status as number }));
    await expect(createGeminiAdapter(http).interpret(input, signal())).rejects.toMatchObject({ code });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it.each([null, {}, body([{ functionCall: { name: 'get_day', args: 'bad' } }]), body([], 'MALFORMED_FUNCTION_CALL'), body([{ text: 'truncated' }], 'MAX_TOKENS')])('rejeita envelope/call inválido %j', value => {
    expect(() => parseGeminiResponse(value)).toThrow();
  });
  it('limita calls e bytes, trata JSON inválido', async () => {
    expect(() => parseGeminiResponse(body(Array.from({ length: 4 }, () => ({ functionCall: { name: 'get_today', args: {} } }))))).toThrow('GIKA_POLICY');
    for (const value of ['not-json', 'x'.repeat(65_537)]) {
      await expect(createGeminiAdapter(async () => new Response(value)).interpret(input, signal())).rejects.toMatchObject({ code: 'GIKA_INVALID_RESPONSE' });
    }
  });
  it('deadline limita transport que ignora cancelamento e não vaza causa', async () => {
    await expect(createGeminiAdapter(() => new Promise(() => {}), 5).interpret(input, signal())).rejects.toMatchObject({ code: 'GIKA_TIMEOUT' });
    const failure = await createGeminiAdapter(async () => { throw new Error('private'); }).interpret(input, signal()).catch(error => error);
    expect(failure.code).toBe('GIKA_UNAVAILABLE'); expect(failure).not.toHaveProperty('cause'); expect(failure.message).not.toContain('private');
  });
  it('consome resposta válida por transport injetado sem chave', async () => {
    const adapter = createGeminiAdapter(async () => Response.json(body([{ functionCall: { name: 'get_day', args: { date: '2026-10-01' } } }])));
    await expect(adapter.interpret(input, signal())).resolves.toEqual([{ name: 'get_day', args: { date: '2026-10-01' } }]);
  });
  it('typed create_task normalizes provider envelope without credentials or persistence', async () => {
    const call = { name: 'create_task', args: { title: 'Academia', dueDate: '2026-10-02', dueTime: null } };
    await expect(createGeminiAdapter(async () => Response.json(body([{ functionCall: call }]))).interpret(input, signal())).resolves.toEqual([call]);
  });
});

 it('general conversation is structured Gemini output; bounded history is context, not tool authority', async () => {
   const conversation = [{role:'user' as const,text:'Oi'}, {role:'assistant' as const,text:'Oi! Como posso te ajudar?'}];
   const payload = geminiPayload({...input, text:'Quem é você?', conversation});
   expect(payload.contents.map(turn => turn.role)).toEqual(['user','model','user']);
   expect(payload.systemInstruction.parts[0]!.text).toContain('Intenção incerta nunca assume mutação');
   const adapter = createGeminiAdapter(async () => Response.json(body([{functionCall:{name:'respond_conversation',args:{text:'Sou a Gika, sua assistente do Leve.'}}}])));
   expect(await adapter.interpret({...input,text:'Quem é você?'},signal())).toEqual([{name:'respond_conversation',args:{text:'Sou a Gika, sua assistente do Leve.'}}]);
 });

 it('conversation schema rejects agenda effects and oversized or identity-bearing history', async () => {
   const {gikaRequestSchema,gikaInterpretationSchema}=await import('../../packages/domain/src/gika');
   const {validateToolCalls}=await import('../../server/gika/createPolicy');
   expect(()=>validateToolCalls([{name:'respond_conversation',args:{text:'Oi',uid:'other'}}])).toThrow();
   expect(()=>gikaRequestSchema.parse({requestId:crypto.randomUUID(),text:'Oi',conversation:Array(7).fill({role:'user',text:'x'})})).toThrow();
   expect(()=>gikaRequestSchema.parse({requestId:crypto.randomUUID(),text:'Oi',conversation:[{role:'user',text:'x',uid:'other'}]})).toThrow();
   expect(()=>gikaInterpretationSchema.parse({text:'Oi',intent:'conversation',simulated:false,reads:[],createTask:{title:'X',dueDate:null,dueTime:null,timeZone:input.context.timeZone}})).toThrow();
 });
