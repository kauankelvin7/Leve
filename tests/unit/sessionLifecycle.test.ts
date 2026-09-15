import { describe, expect, it } from 'vitest';
import { ActivitySession, findRecoverableSessions, MIN_SESSION_MS, saveUnfinishedSession } from '../../apps/web/src/features/activities/sessionLifecycle';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('sessão passiva de atividade', () => {
  it('descarta sessões com menos de 30 segundos', () => {
    const storage = new MemoryStorage();
    const session = new ActivitySession('a', 'Leitura', 'America/Sao_Paulo', 0, '00000000-0000-4000-8000-000000000001');
    saveUnfinishedSession(storage, session.snapshot(MIN_SESSION_MS - 1));
    expect(findRecoverableSessions(storage, 'a', MIN_SESSION_MS)).toEqual([]);
    expect(storage.length).toBe(0);
  });

  it('pausa quando a aba fica oculta e retoma ao voltar', () => {
    const session = new ActivitySession('a', 'Leitura', 'America/Sao_Paulo', 0);
    session.pause(20_000); session.resume(80_000);
    expect(session.elapsedMs(90_000)).toBe(30_000);
  });

  it('mantém sessões de duas abas separadas', () => {
    const storage = new MemoryStorage();
    const first = new ActivitySession('a', 'Leitura', 'America/Sao_Paulo', 0, crypto.randomUUID(), 'alice', 'tab-a');
    const second = new ActivitySession('b', 'Planejamento', 'America/Sao_Paulo', 0, crypto.randomUUID(), 'alice', 'tab-b');
    first.pause(35_000); second.pause(65_000);
    saveUnfinishedSession(storage, first.snapshot(70_000));
    saveUnfinishedSession(storage, second.snapshot(70_000));
    expect(storage.length).toBe(2);
    expect(first.elapsedMs(70_000)).toBe(35_000);
    expect(second.elapsedMs(70_000)).toBe(65_000);
  });

  it('recupera uma sessão salva após recarregar', () => {
    const storage = new MemoryStorage();
    const session = new ActivitySession('a', 'Leitura', 'America/Sao_Paulo', 0, '00000000-0000-4000-8000-000000000002');
    saveUnfinishedSession(storage, session.snapshot(47 * 60_000));
    expect(findRecoverableSessions(storage, 'a', 47 * 60_000 + 1)[0]?.accumulatedMs).toBe(47 * 60_000);
  });

  it('encerra uma única vez e preserva apenas o tempo visível', () => {
    const session = new ActivitySession('a', 'Leitura', 'America/Sao_Paulo', 0);
    session.pause(35_000);
    expect(session.finish(80_000)?.accumulatedMs).toBe(35_000);
    expect(session.finish(90_000)).toBeNull();
  });

  it('não mistura contas nem recupera uma sessão viva em outra aba', () => {
    const storage = new MemoryStorage();
    const session = new ActivitySession('a', 'Leitura', 'America/Sao_Paulo', 0, crypto.randomUUID(), 'alice', 'tab-a');
    saveUnfinishedSession(storage, session.snapshot(60_000));
    expect(findRecoverableSessions(storage, undefined, 61_000, 'bob', 'tab-a')).toEqual([]);
    expect(findRecoverableSessions(storage, undefined, 61_000, 'alice', 'tab-b')).toEqual([]);
    expect(findRecoverableSessions(storage, undefined, 61_000, 'alice', 'tab-a')).toHaveLength(1);
    expect(findRecoverableSessions(storage, undefined, 76_000, 'alice', 'tab-b')).toHaveLength(1);
  });

  it('descarta recuperação com mais de quatro horas', () => {
    const storage = new MemoryStorage();
    const session = new ActivitySession('a', 'Leitura', 'America/Sao_Paulo', 0);
    saveUnfinishedSession(storage, session.snapshot(60_000));
    expect(findRecoverableSessions(storage, 'a', 60_000 + 4 * 60 * 60_000)).toEqual([]);
  });
});
