import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({ callbacks: [] as Array<{ next: (value: unknown) => void; error: (value: unknown) => void }>, snapshot: null as null | (() => { error: string; items: { id: string }[]; loading: boolean }), cleanup: null as null | (() => void), reports: vi.fn() }));
vi.mock('react', () => ({ useCallback: (callback: unknown) => callback, useEffect: () => undefined, useSyncExternalStore: (subscribe: (notify: () => void) => () => void, snapshot: typeof harness.snapshot) => { harness.snapshot = snapshot; harness.cleanup = subscribe(() => undefined); return snapshot!(); } }));
vi.mock('firebase/firestore', () => ({ onSnapshot: (_target: unknown, _options: unknown, next: (value: unknown) => void, error: (value: unknown) => void) => { harness.callbacks.push({ next, error }); return () => undefined; } }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: { currentUser: { uid: 'account-a' } } }));
vi.mock('../../apps/web/src/platform/api', () => ({ apiRequest: harness.reports.mockResolvedValue({}) }));
import { clearQueryCache, useLiveQueries } from '../../apps/web/src/features/content/useLiveQueries';
const snapshot = (id: string) => ({ docs: [{ id, data: () => ({ title: 'Private content' }) }], metadata: { fromCache: false } });
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', globalThis); harness.callbacks = []; harness.reports.mockClear(); clearQueryCache(); });
afterEach(() => { harness.cleanup?.(); clearQueryCache(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('preserva erro de um grupo quando outro grupo recebe novos snapshots, e retry recupera', () => {
  const query = useLiveQueries('calendar:test', () => [1, 2] as never[]);
  harness.callbacks[0]!.next(snapshot('one')); harness.callbacks[1]!.next(snapshot('two'));
  expect(harness.snapshot!().items).toHaveLength(2);
  harness.callbacks[0]!.error({ code: 'permission-denied' });
  harness.callbacks[1]!.next(snapshot('two-new'));
  expect(harness.snapshot!().error).not.toBe('');
  expect(harness.snapshot!().items.map(item => item.id)).toEqual(['one', 'two']);
  expect(JSON.stringify(harness.reports.mock.calls)).not.toContain('Private content');
  query.retry(); harness.callbacks[2]!.next(snapshot('one-new')); harness.callbacks[3]!.next(snapshot('two-new'));
  expect(harness.snapshot!().error).toBe(''); expect(harness.snapshot!().items[0]?.id).toBe('one-new');
});

it('encerra carregamento sem resposta e remove conteúdo no encerramento da conta', () => {
  useLiveQueries('today:test', () => [1] as never[]);
  vi.advanceTimersByTime(10_001);
  expect(harness.snapshot!().loading).toBe(false); expect(harness.snapshot!().error).not.toBe('');
  harness.callbacks[0]!.next(snapshot('private'));
  expect(harness.snapshot!().items).toHaveLength(1);
  clearQueryCache(); expect(harness.snapshot!().items).toHaveLength(0);
});
