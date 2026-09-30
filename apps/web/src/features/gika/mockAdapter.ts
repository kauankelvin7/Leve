import { gikaRequestSchema, gikaResponseSchema, type GikaAdapter } from './conversation';

function reply(text: string) {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  if (normalized.includes('organizar')) return 'Demonstração: primeiro eu consultaria suas tarefas e prepararia uma sugestão para o dia. Nenhuma alteração foi feita.';
  if (normalized.includes('pendencia')) return 'Demonstração: eu consultaria as tarefas em aberto antes de mostrar suas pendências. Sua agenda não foi consultada nesta etapa.';
  if (normalized.includes('amanha')) return 'Demonstração: eu consultaria a data de amanhã no fuso da sua agenda. Nenhuma tarefa foi consultada ou criada nesta etapa.';
  if (normalized.includes('adicionar') || normalized.includes('criar')) return 'Demonstração: escreva o título e a data, como “Academia amanhã”. Nenhuma tarefa será criada nesta etapa.';
  return 'Demonstração: recebi sua pergunta. A consulta à agenda será conectada na próxima etapa. Nenhuma alteração foi feita.';
}

function pause(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delayMs);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** In-memory demo only. No Firebase, HTTP, storage, model or command dependency. */
export function createMockAdapter({ delayMs = 600, failuresBeforeSuccess = 0 }: { delayMs?: number; failuresBeforeSuccess?: number } = {}): GikaAdapter {
  if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 5000 || !Number.isInteger(failuresBeforeSuccess) || failuresBeforeSuccess < 0) throw new Error('Invalid mock configuration');
  let failures = failuresBeforeSuccess;
  return async (raw, signal) => {
    const request = gikaRequestSchema.parse(raw);
    await pause(delayMs, signal);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (failures > 0) { failures--; throw new Error('Simulated adapter failure'); }
    return gikaResponseSchema.parse({ text: reply(request.text), simulated: true });
  };
}

export const mockAdapter = createMockAdapter();
