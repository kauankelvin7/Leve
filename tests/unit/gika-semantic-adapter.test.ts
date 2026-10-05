import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiAdapter, geminiPayload, GEMINI_MODEL, GEMINI_THINKING_LEVEL, type GeminiTransport } from '../../server/gika/gemini.ts';
import type { SemanticTurn } from '../../server/gika/semanticTurn.ts';

const input = {
  text: 'Então faz amanhã às sete da noite',
  context: { today: '2026-10-05', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const },
  conversation: [
    { role: 'user' as const, text: 'Quero colocar pagar João 10 reais na agenda.' },
    { role: 'assistant' as const, text: 'Em qual dia e horário?' },
  ],
};
const response = (args: unknown, name = 'respond_turn') => Response.json({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name, args } }] } }],
});
afterEach(() => vi.restoreAllMocks());

describe('one semantic turn through the real Gemini adapter with controlled transport', () => {
  it('returns classification and a proposal in one upstream call while preserving contextual content', async () => {
    const turn: SemanticTurn = {
      domainIntent: 'AGENDA_ACTION', certain: true, explicitAction: true, reply: null,
      proposals: [{ name: 'create_task', args: { title: 'pagar João 10 reais', dueDate: '2026-10-06', dueTime: '19:00' } }],
    };
    const transport = vi.fn<GeminiTransport>(async () => response(turn));
    const adapter = createGeminiAdapter(transport);

    expect(await adapter.turn!(input, new AbortController().signal)).toEqual(turn);
    expect(transport).toHaveBeenCalledTimes(1);
    const payload = transport.mock.calls[0]![0];
    expect(payload.contents).toEqual([
      { role: 'user', parts: [{ text: input.conversation[0]!.text }] },
      { role: 'model', parts: [{ text: input.conversation[1]!.text }] },
      { role: 'user', parts: [{ text: input.text }] },
    ]);
    expect(payload.tools[0]!.functionDeclarations.map(tool => tool.name)).toEqual(['respond_turn']);
    expect(payload.toolConfig.functionCallingConfig).toEqual({ mode: 'ANY', allowedFunctionNames: ['respond_turn'] });
    expect(payload.generationConfig).toEqual({ maxOutputTokens: 1024, thinkingConfig: { thinkingLevel: 'MEDIUM' } });
    expect(GEMINI_MODEL).toBe('gemini-3.5-flash-lite');
    expect(GEMINI_THINKING_LEVEL).toBe('medium');
  });

  it('retains only the closed current operation fields and rejects provider identities without retry', async () => {
    const transport = vi.fn(async () => response({
      domainIntent: 'AGENDA_ACTION', certain: true, explicitAction: true, reply: null,
      proposals: [{ name: 'reschedule_task', args: { title: 'Academia', date: null,
        patch: { dueDate: '2026-10-06' }, entityId: 'PRIVATE_ENTITY', expectedRevision: 2 } }],
    }));

    await expect(createGeminiAdapter(transport).turn!(input, new AbortController().signal))
      .rejects.toMatchObject({ code: 'GIKA_MALFORMED_CALL' });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('does not accept the legacy classifier as a semantic turn or silently request another interpretation', async () => {
    const transport = vi.fn(async () => response({ intent: 'AGENDA_ACTION', certain: true, reply: null }, 'classify_intent'));

    await expect(createGeminiAdapter(transport).turn!(input, new AbortController().signal))
      .rejects.toMatchObject({ code: 'GIKA_POLICY' });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('keeps private conversational and provider content out of diagnostics', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const transport = vi.fn(async () => response({
      domainIntent: 'ORGANIZATION_CONVERSATION', certain: true, explicitAction: false,
      reply: 'PRIVATE_RESPONSE', proposals: [],
    }));
    const correlationId = '25d826a4-045f-45c7-9884-d141aceb06d5';

    await createGeminiAdapter(transport).turn!({ ...input, text: 'PRIVATE_CURRENT_TEXT', conversation: [{ role: 'user', text: 'PRIVATE_CONTEXT' }] },
      new AbortController().signal, { correlationId });

    const records = [...info.mock.calls, ...warn.mock.calls].map(([line]) => JSON.parse(line as string));
    expect(records.filter(record => record.event === 'gika.upstream.response')).toHaveLength(1);
    expect(records.filter(record => record.event === 'gika.upstream.response')[0]).toHaveProperty('phase', 'semantic');
    expect(records.every(record => record.correlationId === correlationId)).toBe(true);
    expect(JSON.stringify(records)).not.toContain('PRIVATE');
  });

  it('exposes a single interpretation boundary, with no direct confirmation or identity capability', () => {
    const declaration = geminiPayload({ ...input, turnOnly: true }).tools[0]!.functionDeclarations[0]!;
    expect(declaration.name).toBe('respond_turn');
    const schema = declaration.parametersJsonSchema!;
    expect(schema).toMatchObject({ type: 'object', additionalProperties: false,
      required: ['domainIntent', 'certain', 'explicitAction', 'reply', 'proposals'] });
    const encoded = JSON.stringify(schema);
    for (const field of ['confirmationToken', 'expectedRevision', 'operationId', 'entityId', 'uid', 'path']) expect(encoded).not.toContain(`"${field}"`);
  });
});
