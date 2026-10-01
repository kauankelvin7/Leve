import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiAdapter, geminiPayload, GEMINI_ENDPOINT, parseGeminiResponse } from '../../server/gika/gemini';
const input = { text: 'O que tenho hoje?', context: { today: '2026-09-30', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const } };
const signal = () => new AbortController().signal;
const body = (parts: unknown[], finishReason = 'STOP') => ({ candidates: [{ finishReason, content: { parts } }] });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('Gemini Developer adapter, sem credenciais fictícias', () => {
  it('fixa modelo, medium, uma candidate e leituras e somente criação simples', () => {
    const payload = geminiPayload(input);
    expect(GEMINI_ENDPOINT).toContain('gemini-3.5-flash-lite:generateContent');
    expect(payload.generationConfig.thinkingConfig.thinkingLevel).toBe('MEDIUM');
    expect(payload.tools[0]!.functionDeclarations.map(tool => tool.name)).toEqual(['get_today', 'get_day', 'create_task', 'complete_task', 'update_task', 'reschedule_task', 'get_week']);
    expect(payload.tools[0]!.functionDeclarations.find(tool => tool.name === 'update_task')?.parametersJsonSchema).toMatchObject({ additionalProperties: false, required: ['title', 'date', 'patch'], properties: { patch: { additionalProperties: false, required: ['title'] } } });
    expect(payload.tools[0]!.functionDeclarations.find(tool => tool.name === 'create_task')?.parametersJsonSchema).toMatchObject({ additionalProperties: false, required: ['title', 'dueDate', 'dueTime'] });
    expect(payload.contents[0]!.parts).toEqual([{ text: input.text }]);
  });
  it('variável ausente impede qualquer HTTP', async () => {
    vi.stubEnv('GEMINI_API_KEY', ''); const http = vi.spyOn(globalThis, 'fetch');
    await expect(createGeminiAdapter().interpret(input, signal())).rejects.toMatchObject({ code: 'GIKA_NOT_CONFIGURED' });
    expect(http).not.toHaveBeenCalled();
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
