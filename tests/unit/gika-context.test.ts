import { describe, expect, it } from 'vitest';
import { conversationContext } from '../../apps/web/src/features/gika/conversationContext';
import type { GikaMessage } from '../../apps/web/src/features/gika/conversation';
import { GIKA_MAX_CONTEXT_TURNS, GIKA_MAX_REQUEST_BYTES, gikaRequestSchema } from '../../packages/domain/src/gika';
const request = { requestId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', text: 'então faz amanhã' };
const user = (text: string): GikaMessage => ({ id: crypto.randomUUID(), role: 'user', text });
const assistant = (text: string): GikaMessage => ({ id: crypto.randomUUID(), role: 'assistant', text, intent: 'agenda_action' });

describe('bounded agenda conversation context', () => {
  it('keeps follow-up context generic and strips private agenda facts', () => {
    const reply = { ...assistant('Tarefa adicionada.'), createdTask: { id: 'private-id', revision: 1 as const, result: 'applied' as const,
      title: 'Academia', dueDate: '2026-10-06', dueTime: '19:00', timeZone: 'America/Sao_Paulo' } };
    const history = conversationContext([user('agenda academia amanhã às sete da noite'), reply, user('muda o nome'), assistant('Qual será o novo nome?')], request);
    expect(history).toHaveLength(4);
    expect(history[1]!.text).toContain('created');
    expect(history[3]!.text).toBe('Qual será o novo nome?');
    expect(JSON.stringify(history)).not.toMatch(/private-id|revision|timeZone|operationId|token/);
    expect(gikaRequestSchema.safeParse({ ...request, conversation: history }).success).toBe(true);
  });
  it('keeps previews explicitly uncommitted and strips the HMAC and identity', () => {
    const reply = { ...assistant('Confira antes de mover.'), rescheduleTask: { id: 'private-id', revision: 3,
      title: 'Academia', dueDate: '2026-10-06', dueTime: '19:00', timeZone: 'America/Sao_Paulo', patch: { dueDate: '2026-10-07' } },
      confirmation: { token: 'secret-grant' } } as GikaMessage;
    const serialized = JSON.stringify(conversationContext([user('move academia para amanhã'), reply], request));
    expect(serialized).toContain('preview_only');
    expect(serialized).toContain('never confirms');
    expect(serialized).not.toMatch(/private-id|secret-grant|revision|timeZone/);
  });
  it('retains at most six complete recent pairs and never sends orphan or simulated turns', () => {
    const messages = Array.from({ length: 10 }, (_, i) => [user(`pedido ${i}`), assistant(`resposta ${i}`)]).flat();
    messages.push(user('não respondeu ainda'));
    const history = conversationContext(messages, request);
    expect(history).toHaveLength(GIKA_MAX_CONTEXT_TURNS);
    expect(history[0]!.text).toBe('pedido 4');
    expect(history.at(-1)!.text).toBe('resposta 9');
    expect(conversationContext([user('demo'), { ...assistant('demo'), simulated: true }], request)).toEqual([]);
  });
  it('removes oldest whole pairs to respect the unchanged UTF-8 cap with maximal input', () => {
    const messages = Array.from({ length: 20 }, () => [user('🟢'.repeat(500)), assistant('🟢'.repeat(500))]).flat();
    const current = { ...request, text: 'á'.repeat(2000) };
    const history = conversationContext(messages, current);
    expect(history.length % 2).toBe(0);
    expect(history.length).toBeGreaterThan(0);
    expect(new TextEncoder().encode(JSON.stringify({ ...current, conversation: history })).byteLength).toBeLessThanOrEqual(GIKA_MAX_REQUEST_BYTES);
    expect(gikaRequestSchema.safeParse({ ...current, conversation: history }).success).toBe(true);
  });
  it('a checked confirmation outcome supersedes the old preview date; cancel and undo never claim an applied effect', () => {
    const reply = { ...assistant('Confira antes de mover.'), rescheduleTask: { id: 'private-id', revision: 3,
      title: 'Academia', dueDate: '2026-10-06', dueTime: '19:00', timeZone: 'America/Sao_Paulo', patch: { dueDate: '2026-10-07' } },
      contextOutcome: { state: 'confirmed' as const, tasks: [{ title: 'Academia', dueDate: '2026-10-07', dueTime: '19:00' }] } };
    const history = JSON.stringify(conversationContext([user('move academia'), reply], request));
    expect(history).toContain('confirmed');
    expect(history).not.toMatch(/2026-10-07/);
    expect(history).not.toMatch(/2026-10-06|private-id|preview_only|revision/);
    for (const state of ['cancelled', 'undone', 'uncertain'] as const) {
      const history = JSON.stringify(conversationContext([user('move academia'), { ...reply, contextOutcome: { state, tasks: [] } }], request));
      expect(history).toContain(state); expect(history).not.toMatch(/confirmed|2026-10-07|preview_only/);
    }
  });

});
