import { describe, expect, it, vi } from 'vitest';
import { createMockAdapter } from '../../apps/web/src/features/gika/mockAdapter';
import { gikaRequestSchema, gikaResponseSchema } from '../../apps/web/src/features/gika/conversation';

const request = (text: string) => ({ requestId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', text });

describe('Gika mock boundary', () => {
  it.each(['Organizar meu dia', 'Ver minhas pendências', 'O que tenho amanhã?', 'Adicionar uma tarefa', 'Apaga tudo'])('resposta previsível e explicitamente simulada para %s', async text => {
    const mock = createMockAdapter({ delayMs: 0 });
    const first = await mock(request(text), new AbortController().signal);
    const second = await mock(request(text), new AbortController().signal);
    expect(first).toEqual(second);
    expect(first.simulated).toBe(true);
    expect(first.text).toMatch(/^Demonstração:/);
    expect(first.text).toMatch(/Nenhuma|não foi/);
  });

  it('rejeita contratos malformados sem executar um callback externo', async () => {
    expect(gikaRequestSchema.safeParse(request(' ')).success).toBe(false);
    expect(gikaRequestSchema.safeParse(request('x'.repeat(2001))).success).toBe(false);
    expect(gikaRequestSchema.safeParse({ ...request('hoje'), uid: 'outra-conta' }).success).toBe(false);
    expect(gikaResponseSchema.safeParse({ text: 'Tarefa criada.', simulated: false }).success).toBe(false);
    expect(gikaResponseSchema.safeParse({ text: 'ok', simulated: true, command: 'activity.create' }).success).toBe(false);
    await expect(createMockAdapter({ delayMs: 0 })(request(''), new AbortController().signal)).rejects.toThrow();
  });

  it('prévia mock é explícita, limitada e não aceita ações de domínio', async () => {
    const response = await createMockAdapter({ delayMs: 0 })(request('Organizar meu dia'), new AbortController().signal);
    expect(response.preview).toBe('organize-demo');
    expect(gikaResponseSchema.safeParse({ text: 'ok', simulated: true, preview: { command: 'activity.update' } }).success).toBe(false);
  });

  it('cancelamento impede resposta pendente e libera o timer', async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const response = createMockAdapter()(request('hoje'), controller.signal);
      const rejected = expect(response).rejects.toMatchObject({ name: 'AbortError' });
      controller.abort();
      await rejected;
      expect(vi.getTimerCount()).toBe(0);
      await expect(createMockAdapter()(request('hoje'), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    } finally { vi.useRealTimers(); }
  });

  it('falha controlada permite retry da mesma tentativa lógica', async () => {
    const mock = createMockAdapter({ delayMs: 0, failuresBeforeSuccess: 1 });
    const input = request('Academia amanhã');
    await expect(mock(input, new AbortController().signal)).rejects.toThrow();
    await expect(mock(input, new AbortController().signal)).resolves.toMatchObject({ simulated: true });
  });
});
