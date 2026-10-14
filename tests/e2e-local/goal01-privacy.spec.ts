import { expect, test, type Page } from '@playwright/test';
async function login(page: Page) {
  if (!new URL(page.url()).pathname.endsWith('/entrar')) await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test'); await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByLabel('Seu nome').fill('Conta local'); await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await expect(page).toHaveURL(/\/hoje$/);
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  if (await skip.count()) { await expect(skip).toBeVisible(); await skip.click(); }
  await expect(page.getByRole('heading', { name: 'Meu dia' })).toBeVisible();
}
async function seedPrivateWork(page: Page) {
  return page.evaluate(async () => {
    const uid = localStorage.getItem('leve.offlineAccount')!;
    const request = indexedDB.open('leve-local-v1');
    await new Promise<void>((resolve, reject) => { request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
    const db = request.result;
    const tx = db.transaction(['drafts', 'outbox-v2'], 'readwrite');
    tx.objectStore('drafts').put({ key: `${uid}:privacy-fixture`, uid, name: 'privacy-fixture', value: { text: 'rascunho preservado' }, updatedAt: new Date().toISOString() });
    tx.objectStore('outbox-v2').put({ key: `${uid}:legacy-operation`, uid, operationId: 'legacy-operation', createdAt: '2000-01-01T00:00:00.000Z', command: { command: 'note.create', operationId: 'legacy-operation' } });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); }); db.close(); return uid;
  });
}
async function work(page: Page, uid: string) {
  return page.evaluate(async account => {
    const request = indexedDB.open('leve-local-v1'); await new Promise<void>(resolve => { request.onsuccess = () => resolve(); }); const db = request.result;
    const values = await Promise.all(['drafts', 'outbox-v2'].map(name => new Promise<number>(resolve => { const req = db.transaction(name).objectStore(name).getAll(); req.onsuccess = () => resolve(req.result.filter((record: { uid: string }) => record.uid === account).length); })));
    db.close(); return values;
  }, uid);
}
test('GOAL01 new account consent is off, legacy private work survives migration and reload', async ({ page }) => {
  await login(page); const uid = await seedPrivateWork(page);
  await page.evaluate(() => { localStorage.setItem('leve.offlineEnabled', 'true'); localStorage.removeItem('leve.offlinePrivacyMigration.v1'); });
  await page.reload(); await page.goto('/configuracoes');
  await expect(page.getByLabel('Permitir uso offline desta conta neste aparelho')).not.toBeChecked();
  await expect(page.getByText(/A opção antiga não ativa o uso offline/)).toContainText('1 alteração pendente');
  expect(await work(page, uid)).toEqual([1, 1]);
  expect(await page.evaluate(() => localStorage.getItem('leve.offlinePrivacyMigration.v1'))).toBe('done');
});
test('GOAL01 disabling with pending work refuses deletion and controlled checkbox remains on', async ({ page }) => {
  await login(page); await page.goto('/configuracoes');
  await page.getByLabel('Permitir uso offline desta conta neste aparelho').click();
  await expect(page.getByLabel('Permitir uso offline desta conta neste aparelho')).toBeChecked();
  const uid = await seedPrivateWork(page); await page.reload();
  await page.getByLabel('Permitir uso offline desta conta neste aparelho').click();
  await expect(page.getByText('Sincronize as alterações pendentes antes de desativar o uso offline. Nada foi removido.')).toBeVisible();
  await expect(page.getByLabel('Permitir uso offline desta conta neste aparelho')).toBeChecked(); expect(await work(page, uid)).toEqual([1, 1]);
});
test('GOAL01 cancelling logout preserves drafts, outbox and account', async ({ page }) => {
  await login(page); const uid = await seedPrivateWork(page);
  page.once('dialog', async dialog => { expect(dialog.message()).toContain('ainda não foi enviado será perdido'); await dialog.dismiss(); });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu dia' })).toBeVisible(); expect(await work(page, uid)).toEqual([1, 1]);
});
test('GOAL01 confirmed device cleanup removes own legacy work and preserves another UID', async ({ page }) => {
  await login(page); const uid = await seedPrivateWork(page);
  await page.evaluate(async account => {
    const now = Date.now();
    localStorage.setItem('leve.activitySession.own.timer', JSON.stringify({ uid: account, tabId: 'fixture-tab', active: false, sessionId: 'fixture-session', activityId: 'own', activityTitle: 'private timer', timeZone: 'America/Sao_Paulo', startedAt: now - 40_000, accumulatedMs: 40_000, resumedAt: null, savedAt: now }));
    localStorage.setItem('leve.activitySession.other.timer', JSON.stringify({ uid: 'other-account', tabId: 'fixture-tab', active: false, sessionId: 'other-session', activityId: 'other', activityTitle: 'other private timer', timeZone: 'America/Sao_Paulo', startedAt: now - 40_000, accumulatedMs: 40_000, resumedAt: null, savedAt: now }));
    const request = indexedDB.open('leve-local-v1'); await new Promise<void>(resolve => { request.onsuccess = () => resolve(); }); const db = request.result;
    const tx = db.transaction(['drafts', 'outbox-v2'], 'readwrite');
    tx.objectStore('drafts').put({ key: 'other-account:note', uid: 'other-account', value: 'other draft' });
    tx.objectStore('outbox-v2').put({ key: 'other-account:operation', uid: 'other-account', operationId: 'operation', createdAt: new Date().toISOString(), command: {} });
    await new Promise<void>(resolve => { tx.oncomplete = () => resolve(); }); db.close();
  }, uid);
  await page.goto('/configuracoes');
  const cleanupReload = page.waitForLoadState('load');
  page.once('dialog', async dialog => { expect(dialog.message()).toContain('1 alteração pendente e 2 rascunhos'); await dialog.accept(); });
  await page.getByRole('button', { name: 'Remover dados desta conta do aparelho' }).click();
  await cleanupReload;
  await expect(page.getByLabel('Permitir uso offline desta conta neste aparelho')).not.toBeChecked();
  await expect.poll(async () => await work(page, uid)).toEqual([0, 0]);
  expect(await work(page, 'other-account')).toEqual([1, 1]);
  expect(await page.evaluate(() => localStorage.getItem('leve.activitySession.own.timer'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('leve.activitySession.other.timer'))).not.toBeNull();
});
test('GOAL01 cleanup aborts when another tab queues work after confirmation snapshot', async ({ page }) => {
  await login(page); const uid = await seedPrivateWork(page);
  const result = await page.evaluate(async account => {
    const outboxPath = '/src/platform/outbox.ts'; const { localWorkCounts, clearLocalData, queueCommand, pendingCommands } = await import(/* @vite-ignore */ outboxPath);
    const confirmed = await localWorkCounts(account);
    await queueCommand(account, { command: 'note.update', operationId: crypto.randomUUID(), entityId: 'late-note', expectedRevision: 1, payload: { title: 'Nova alteração' } });
    let rejected = false;
    try { await clearLocalData(account, { discardUserWork: true, expectedFingerprint: confirmed.fingerprint }); } catch { rejected = true; }
    return { rejected, pending: (await pendingCommands(account)).length };
  }, uid);
  expect(result).toEqual({ rejected: true, pending: 2 });
  expect(await work(page, uid)).toEqual([1, 2]);
});
test('GOAL01 an opted-in account restores Firestore persistence after logout and sign-in', async ({ page }) => {
  await login(page); await page.goto('/configuracoes');
  const consent = page.getByLabel('Permitir uso offline desta conta neste aparelho');
  if (!(await consent.isChecked())) await consent.click();
  await expect(consent).toBeChecked();
  const uid = await page.evaluate(() => localStorage.getItem('leve.offlineAccount'));
  // Simulate a previously opted-in install that has not completed the one-time
  // privacy migration introduced by this release.
  await page.evaluate(() => localStorage.removeItem('leve.offlinePrivacyMigration.v1'));
  await page.reload();
  await expect(page.getByLabel('Permitir uso offline desta conta neste aparelho')).toBeChecked();
  await expect.poll(async () => page.evaluate(async () => (await indexedDB.databases()).some(database => database.name?.includes('firestore')))).toBe(true);
  const logoutReload = page.waitForLoadState('load');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await logoutReload;
  await expect(page).toHaveURL(/\/entrar$/);
  await login(page);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('leve.offlineAccount'))).toBe(uid);
  await page.goto('/configuracoes');
  await expect(page.getByLabel('Permitir uso offline desta conta neste aparelho')).toBeChecked();
  await expect.poll(async () => page.evaluate(async () => (await indexedDB.databases()).some(database => database.name?.includes('firestore')))).toBe(true);
});
