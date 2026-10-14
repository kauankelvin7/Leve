import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test'); await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByLabel('Seu nome').fill('Conta local'); await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await expect(page).toHaveURL(/\/hoje$/);
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true }); if (await skip.isVisible()) await skip.click();
}

test('GOAL-01 identical retries preserve queued content and age; changed operationId payload is rejected atomically', async ({ page }) => {
  await page.goto('/entrar');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/platform/outbox.ts';
    const { queueCommand, pendingCommands } = await import(/* @vite-ignore */ modulePath);
    const command = { command: 'note.update', operationId: crypto.randomUUID(), entityId: 'note-test', expectedRevision: 1, payload: { title: 'Original', body: 'Private' } };
    await queueCommand('outbox-test', command);
    const first = (await pendingCommands('outbox-test'))[0];
    await queueCommand('outbox-test', { ...command, payload: { body: 'Private', title: 'Original' } });
    let rejected = false;
    try { await queueCommand('outbox-test', { ...command, payload: { title: 'Overwrite' } }); } catch { rejected = true; }
    const saved = await pendingCommands('outbox-test');
    return { rejected, count: saved.length, createdAt: saved[0].createdAt, originalTime: first.createdAt, title: saved[0].command.payload.title };
  });
  expect(result).toEqual({ rejected: true, count: 1, createdAt: result.originalTime, originalTime: result.originalTime, title: 'Original' });
});

test('GOAL-01 fallback leadership is atomic across tabs and expired owners are fenced', async ({ page, context }) => {
  await page.goto('/entrar');
  const other = await context.newPage(); await other.goto('/entrar');
  for (const tab of [page, other]) await tab.evaluate(() => Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined }));
  await page.evaluate(async () => {
    const modulePath = '/src/platform/outboxLeadership.ts'; const { withOutboxLeadership } = await import(/* @vite-ignore */ modulePath);
    const state = globalThis as unknown as { acquired: boolean; release: () => void; guard: () => Promise<void>; complete: Promise<unknown> };
    state.complete = withOutboxLeadership('lease-test', async (guard: () => Promise<void>) => { state.guard = guard; state.acquired = true; await new Promise<void>(resolve => { state.release = resolve; }); });
  });
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { acquired: boolean }).acquired)).toBe(true);
  const contender = await other.evaluate(async () => {
    const modulePath = '/src/platform/outboxLeadership.ts'; const { withOutboxLeadership } = await import(/* @vite-ignore */ modulePath);
    return (await withOutboxLeadership('lease-test', async () => 'acquired')) ?? 'busy';
  });
  expect(contender).toBe('busy');
  // Force expiration without a timing race or a 30-second sleep.
  await other.evaluate(async () => {
    const modulePath = '/src/platform/localData.ts'; const { localTransaction, LEASE_STORE } = await import(/* @vite-ignore */ modulePath);
    await localTransaction(LEASE_STORE, 'readwrite', (store: IDBObjectStore, resolve: () => void) => {
      const read = store.get('lease-test'); read.onsuccess = () => { const write = store.put({ ...read.result, expiresAt: 0 }); write.onsuccess = resolve; };
    });
    const leadershipPath = '/src/platform/outboxLeadership.ts'; const { withOutboxLeadership } = await import(/* @vite-ignore */ leadershipPath);
    const state = globalThis as unknown as { acquired: boolean; release: () => void; complete: Promise<unknown> };
    state.complete = withOutboxLeadership('lease-test', async () => { state.acquired = true; await new Promise<void>(resolve => { state.release = resolve; }); });
  });
  await expect.poll(() => other.evaluate(() => (globalThis as unknown as { acquired: boolean }).acquired)).toBe(true);
  expect(await page.evaluate(async () => {
    const state = globalThis as unknown as { guard: () => Promise<void> }; try { await state.guard(); return 'accepted'; } catch (failure) { return failure instanceof Error ? failure.name : 'unknown'; }
  })).toBe('OutboxLeadershipLostError');
  await page.evaluate(async () => { const state = globalThis as unknown as { release: () => void; complete: Promise<unknown> }; state.release(); await state.complete; });
  // Releasing the expired owner must not release its successor.
  expect(await page.evaluate(async () => {
    const modulePath = '/src/platform/outboxLeadership.ts'; const { withOutboxLeadership } = await import(/* @vite-ignore */ modulePath);
    return (await withOutboxLeadership('lease-test', async () => 'acquired')) ?? 'busy';
  })).toBe('busy');
  await other.evaluate(async () => { const state = globalThis as unknown as { release: () => void; complete: Promise<unknown> }; state.release(); await state.complete; });
});

test('GOAL-01 version 4 upgrade does not resurrect already sent legacy commands', async ({ page }) => {
  await page.goto('/entrar');
  const result = await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('leve-local-v1', 4);
      request.onupgradeneeded = () => {
        const db = request.result;
        const legacy = db.createObjectStore('outbox', { keyPath: 'operationId' });
        legacy.put({ uid: 'migration-test', operationId: 'already-sent', createdAt: '2020-01-01T00:00:00.000Z' });
        const current = db.createObjectStore('outbox-v2', { keyPath: 'key' }); current.createIndex('uid-createdAt', ['uid', 'createdAt']);
        db.createObjectStore('drafts', { keyPath: 'key' }); db.createObjectStore('session-cache', { keyPath: 'uid' });
      };
      request.onerror = () => reject(request.error); request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const modulePath = '/src/platform/localData.ts'; const { openLocalDatabase } = await import(/* @vite-ignore */ modulePath);
    const db = await openLocalDatabase();
    const info = { version: db.version, legacyPresent: db.objectStoreNames.contains('outbox') }; db.close();
    const outboxPath = '/src/platform/outbox.ts'; const { pendingCommands } = await import(/* @vite-ignore */ outboxPath);
    return { ...info, pending: (await pendingCommands('migration-test')).length };
  });
  expect(result).toEqual({ version: 5, legacyPresent: false, pending: 0 });
});

test('GOAL-01 real IndexedDB abort after request success never reports durable success', async ({ page }) => {
  await page.goto('/entrar');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/platform/localData.ts'; const { localTransaction, DRAFT_STORE } = await import(/* @vite-ignore */ modulePath);
    let rejected = false;
    try {
      await localTransaction(DRAFT_STORE, 'readwrite', (store: IDBObjectStore, resolve: () => void) => {
        const put = store.put({ key: 'aborted', uid: 'rollback-test', value: 'Private' });
        put.onsuccess = () => { resolve(); store.transaction.abort(); };
      });
    } catch { rejected = true; }
    const persisted = await localTransaction(DRAFT_STORE, 'readonly', (store: IDBObjectStore, resolve: (value: unknown) => void) => {
      const read = store.get('aborted'); read.onsuccess = () => resolve(read.result);
    });
    return { rejected, exists: Boolean(persisted) };
  });
  expect(result).toEqual({ rejected: true, exists: false });
});

test('GOAL-01 simultaneous fallback acquisition admits exactly one tab', async ({ page, context }) => {
  const other = await context.newPage();
  for (const tab of [page, other]) { await tab.goto('/entrar'); await tab.evaluate(() => Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })); }
  await Promise.all([page, other].map(tab => tab.evaluate(async () => {
    const modulePath = '/src/platform/outboxLeadership.ts'; const { withOutboxLeadership } = await import(/* @vite-ignore */ modulePath);
    const state = globalThis as unknown as { acquired: boolean; busy: boolean; release?: () => void; complete: Promise<unknown> };
    state.acquired = false; state.busy = false;
    state.complete = withOutboxLeadership('race-test', async () => { state.acquired = true; await new Promise<void>(resolve => { state.release = resolve; }); return 'acquired'; })
      .then((result: unknown) => { if (result === undefined) state.busy = true; });
  })));
  const states = () => Promise.all([page, other].map(tab => tab.evaluate(() => { const state = globalThis as unknown as { acquired: boolean; busy: boolean }; return { acquired: state.acquired, busy: state.busy }; })));
  await expect.poll(async () => (await states()).filter(state => state.acquired).length).toBe(1);
  await expect.poll(async () => (await states()).filter(state => state.busy).length).toBe(1);
  await Promise.all([page, other].map(tab => tab.evaluate(async () => { const state = globalThis as unknown as { release?: () => void; complete: Promise<unknown> }; state.release?.(); await state.complete; })));
});

test('GOAL-01 expired pending content can be copied and is removed only after explicit confirmation', async ({ page }) => {
  await login(page);
  const uid = await page.evaluate(async () => {
    const account = localStorage.getItem('leve.offlineAccount')!;
    const modulePath = '/src/platform/outbox.ts'; const { queueCommand } = await import(/* @vite-ignore */ modulePath);
    const operationId = crypto.randomUUID();
    const command = { command: 'note.update', operationId, entityId: 'recovery-note', expectedRevision: 2, payload: { title: 'Nota recuperável', bodyDoc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto que precisa ser copiado' }] }] }, fcmToken: 'secret-token', signature: 'secret-signature' } };
    await queueCommand(account, command);
    const request = indexedDB.open('leve-local-v1'); await new Promise<void>((resolve, reject) => { request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
    const db = request.result; const tx = db.transaction('outbox-v2', 'readwrite'); const store = tx.objectStore('outbox-v2');
    const key = `${account}:${operationId}`; const read = store.get(key); read.onsuccess = () => store.put({ ...read.result, createdAt: '2020-01-01T00:00:00.000Z', command: { ...read.result.command, clientCreatedAt: '2020-01-01T00:00:00.000Z' } });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); }); db.close();
    return account;
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Revisar alterações' })).toBeVisible();
  await page.getByRole('button', { name: 'Revisar alterações' }).click();
  const recovery = page.getByRole('dialog', { name: 'Alterações neste aparelho' });
  const content = recovery.getByLabel('Conteúdo para copiar');
  await expect(content).toHaveValue(/Nota recuperável/); await expect(content).toHaveValue(/Texto que precisa ser copiado/);
  await expect(content).not.toHaveValue(/secret-token|secret-signature|recovery-note/);
  await recovery.getByRole('button', { name: 'Remover esta pendência' }).click();
  await expect(recovery.getByRole('button', { name: 'Confirmar remoção' })).toBeDisabled();
  await recovery.getByRole('button', { name: 'Cancelar' }).click();
  await expect.poll(async () => page.evaluate(async account => {
    const modulePath = '/src/platform/outbox.ts'; const { pendingCommands } = await import(/* @vite-ignore */ modulePath); return (await pendingCommands(account)).length;
  }, uid)).toBe(1);
  await recovery.getByRole('button', { name: 'Remover esta pendência' }).click();
  await recovery.getByRole('checkbox', { name: 'Já copiei ou recuperei o que preciso' }).check();
  await recovery.getByRole('button', { name: 'Confirmar remoção' }).click();
  await expect.poll(async () => page.evaluate(async account => {
    const modulePath = '/src/platform/outbox.ts'; const { pendingCommands } = await import(/* @vite-ignore */ modulePath); return (await pendingCommands(account)).length;
  }, uid)).toBe(0);
});
