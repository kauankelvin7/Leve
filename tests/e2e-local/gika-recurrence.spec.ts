import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Temporal } from '@js-temporal/polyfill';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { inspectRecurrence } from '../../server/gika/recurrenceGuard';
import { issueRecurrenceChoice } from '../../server/gika/confirmation';
import { recurrenceProposalSchema } from '../../packages/domain/src/gikaRecurrence';

// Isolated test-worker read client; all mutations still go through conventional commands.
process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
if (!/^localhost:8080$|^127\.0\.0\.1:8080$/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw Error('Local emulator required.');
const db = getFirestore(getApps().find(app => app.name === 'gika-recurrence-e2e') ?? initializeApp({ projectId: 'demo-leve' }, 'gika-recurrence-e2e'));
const zone = 'America/Sao_Paulo', day = Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString();
async function enter(page: Page) {
  await page.goto('/entrar'); await page.getByLabel('E-mail').fill('leve.local@example.test'); await page.getByLabel('Senha', { exact: true }).fill('leve-local-123'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia'); const skip = page.getByRole('button', { name: 'Pular guia', exact: true }); await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) { const ack = page.waitForResponse(r => r.url().endsWith('/api/commands') && r.request().postDataJSON()?.command === 'profile.completeTutorial'); await skip.click(); await ack; }
}
async function setupSeries(page: Page, title: string) {
  const identity = await page.evaluate(async title => {
    const apiPath = '/src/platform/api.ts', authPath = '/src/platform/firebase.ts';
    const { sendCommand } = await import(/* @vite-ignore */ apiPath), { firebaseAuth } = await import(/* @vite-ignore */ authPath);
    const id = crypto.randomUUID();
    await sendCommand({ command: 'activity.createSeries', operationId: crypto.randomUUID(), entityId: id, expectedRevision: 0, payload: { activity: { title, descriptionPlain: 'Nota sintética preservada', categoryId: null, colorHex: '#65A885', estimatedMinutes: 25, reminderSpecs: [], schedule: { type: 'task', dueDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), dueTime: '10:00', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' } }, recurrence: { frequency: 'daily', interval: 1, count: 3, until: null, monthlyPolicy: 'lastDay' } } });
    return { uid: firebaseAuth.currentUser.uid as string, seriesId: id };
  }, title);
  const collection = db.collection(`users/${identity.uid}/activities`);
  const docs = (await collection.where('seriesId', '==', identity.seriesId).get()).docs.sort((a, b) => String(a.data().occurrenceKey).localeCompare(String(b.data().occurrenceKey)));
  expect(docs).toHaveLength(3);
  const target = docs[0], sibling = docs[1];
  if (!target || !sibling) throw Error('Recurring fixture needs target and sibling.');
  const targetData = target.data(), series = (await db.doc(`users/${identity.uid}/series/${identity.seriesId}`).get()).data();
  if (!series) throw Error('Recurring fixture series is missing.');
  const snapshot = inspectRecurrence(identity.seriesId, target.id, series, targetData, docs.map(document => ({ id: document.id, data: document.data() })));
  if (!snapshot) throw Error('Recurring fixture snapshot is invalid.');
  expect(snapshot.futureAllowed).toBe(true);
  const proposal = recurrenceProposalSchema.parse({ operation: 'update', task: { id: target.id, title, dueDate: day, dueTime: '10:00', timeZone: zone, revision: 1 }, patch: { title: `${title} nova` }, recurrence: snapshot });
  let model = 0, input: { requestId: string; text: string } | undefined;
  await page.route('**/api/gika/respond', async route => { model++; input = route.request().postDataJSON(); const choice = issueRecurrenceChoice(identity.uid, input!, proposal); await route.fulfill({ json: { text: 'Quer alterar só esta tarefa ou também as próximas?', simulated: false, reads: [], recurrenceChoice: choice } }); });
  return { ...identity, target, sibling, docs, title, proposal, model: () => model, input: () => input! };
}
async function ask(page: Page, title: string) {
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click(); const text = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }); await text.fill(`Renomeia "${title}" para "${title} nova"`); await text.press('Enter');
  return page.getByRole('group', { name: 'Escolher tarefas da rotina', exact: true });
}
for (const mobile of [false, true]) test(`M5-T3 ${mobile ? 'mobile dark' : 'desktop light'} occurrence preview, real ack and sibling isolation`, async ({ page }) => {
  if (mobile) { await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); }
  await enter(page); if (mobile) await page.evaluate(async () => { const path = '/src/platform/theme.ts'; (await import(/* @vite-ignore */ path)).applyAppearance('dark'); });
  const fixture = await setupSeries(page, `Teste Gika M5T3 ${mobile ? 'mobile' : 'desktop'}`);
  let commands = 0, committed = false, release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/commands', async route => { commands++; const c = route.request().postDataJSON(); expect(c.entityId).toBe(fixture.target.id); expect(c.gikaRecurrence).toBeTruthy(); const r = await route.fetch(); expect(r.status()).toBe(200); committed = true; await gate; await route.fulfill({ response: r }); });
  const choice = await ask(page, fixture.title), occurrence = choice.getByRole('button', { name: 'Só esta', exact: true });
  if (mobile) await occurrence.click(); else { await occurrence.focus(); await page.keyboard.press('Enter'); }
  const preview = page.getByRole('group', { name: 'Prévia da rotina', exact: true }); await expect(preview).toContainText('Só esta tarefa.'); expect(commands).toBe(0); await expect(page.getByRole('button', { name: 'Só esta', exact: true })).toHaveCount(0);
  await expect(preview.getByRole('status')).toBeFocused();
  await page.screenshot({ path: `/tmp/leve-m5t3-recurrence-${mobile ? 'mobile-dark' : 'desktop-light'}.png` });
  const confirm = preview.getByRole('button', { name: 'Renomear tarefa', exact: true }), handle = await confirm.elementHandle(); await confirm.click(); await handle!.dispatchEvent('click'); await expect.poll(() => committed).toBe(true);
  await expect(page.getByRole('group', { name: 'Rotina atualizada' })).toHaveCount(0); release();
  const success = page.getByRole('group', { name: 'Rotina atualizada' }); await expect(success).toContainText('Tarefa renomeada.'); expect(commands).toBe(1); expect(fixture.model()).toBe(1); await expect(success.getByRole('button')).toHaveCount(0);
  expect((await fixture.target.ref.get()).data()).toMatchObject({ title: fixture.title + ' nova', revision: 2, seriesId: fixture.seriesId });
  for (const sibling of fixture.docs.slice(1)) expect((await sibling.ref.get()).data()).toEqual(sibling.data());
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
});
test('M5-T3 scope cancellation and preview cancellation are terminal without commands', async ({ page }) => {
  await enter(page); const fixture = await setupSeries(page, 'Teste Gika M5T3 cancelar'); let commands = 0; page.on('request', r => { if (r.url().endsWith('/api/commands') && r.method() === 'POST') commands++; });
  const choice = await ask(page, fixture.title); await choice.getByRole('button', { name: 'Cancelar', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(choice).toHaveAttribute('data-recurrence-state', 'cancelled'); await expect(choice.getByRole('status')).toBeFocused(); await expect(choice.getByRole('button')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }).fill(`Renomeia "${fixture.title}" para "${fixture.title} nova"`); await page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }).press('Enter');
  const next = page.getByRole('group', { name: 'Escolher tarefas da rotina', exact: true }).last(); await next.getByRole('button', { name: 'Esta e as próximas', exact: true }).click(); const preview = page.getByRole('group', { name: 'Prévia da rotina', exact: true }); await preview.getByRole('button', { name: 'Cancelar', exact: true }).click(); await expect(preview).toHaveAttribute('data-recurrence-state', 'cancelled'); await expect(preview.getByRole('button')).toHaveCount(0); expect(commands).toBe(0); expect(fixture.model()).toBe(2);
});
test('M5-T3 future lost ack repeats receipt without new Gemini or scope choice', async ({ page }) => {
  await enter(page); const fixture = await setupSeries(page, 'Teste Gika M5T3 futuras'); const ops: string[] = [], results: string[] = []; let choices = 0;
  page.on('request', r => { if (r.url().endsWith('/api/gika/choose-recurrence')) choices++; });
  await page.route('**/api/commands', async route => { const c = route.request().postDataJSON(); expect(c.command).toBe('activity.updateFuture'); ops.push(c.operationId); const r = await route.fetch(); expect(r.status()).toBe(200); results.push((await r.json()).result); if (ops.length === 1) await route.abort('failed'); else await route.fulfill({ response: r }); });
  const choice = await ask(page, fixture.title); await choice.getByRole('button', { name: 'Esta e as próximas', exact: true }).click(); const preview = page.getByRole('group', { name: 'Prévia da rotina' }); await expect(preview).toContainText('3 tarefas disponíveis agora'); await preview.getByRole('button', { name: 'Renomear esta e as próximas', exact: true }).click(); await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible(); await expect(page.getByRole('group', { name: 'Rotina atualizada' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(page.getByRole('group', { name: 'Rotina atualizada' })).toContainText('3 tarefas renomeadas.'); expect(ops[0]).toBe(ops[1]); expect(results).toEqual(['applied', 'alreadyApplied']); expect(choices).toBe(1); expect(fixture.model()).toBe(1);
  const active = await db.collection(`users/${fixture.uid}/activities`).where('title', '==', fixture.title + ' nova').get(); expect(active.size).toBe(3); expect(new Set(active.docs.map(d => d.data().seriesId)).size).toBe(1); for (const old of fixture.docs) expect((await old.ref.get()).exists).toBe(false);
});
test('M5-T3 tampered scope transport cannot change a sibling or execute future intent', async ({ page }) => {
  await enter(page); const fixture = await setupSeries(page, 'Teste Gika M5T3 adulterada');
  await page.route('**/api/commands', async route => { const c = route.request().postDataJSON(); const r = await route.fetch({ postData: { ...c, entityId: fixture.sibling.id } }); expect(r.status()).toBe(422); await route.fulfill({ response: r }); });
  const choice = await ask(page, fixture.title); await choice.getByRole('button', { name: 'Só esta', exact: true }).click(); await page.getByRole('button', { name: 'Renomear tarefa', exact: true }).click(); const preview = page.getByRole('group', { name: 'Prévia da rotina' }); await expect(preview).toHaveAttribute('data-recurrence-state', 'failed'); await expect(preview.getByRole('button')).toHaveCount(0); expect(fixture.model()).toBe(1); for (const doc of fixture.docs) expect((await doc.ref.get()).data()).toEqual(doc.data());
});
test('M5-T3 logout invalidates old scope card and stale bridge cannot dispatch', async ({ page }) => {
  await enter(page); const fixture = await setupSeries(page, 'Teste Gika M5T3 logout'); let writes = 0, choices = 0;
  await ask(page, fixture.title); await expect(page.getByRole('button', { name: 'Só esta', exact: true })).toBeVisible();
  const choice = issueRecurrenceChoice(fixture.uid, fixture.input(), fixture.proposal);
  page.on('request', r => { if (r.url().endsWith('/api/commands') && r.method() === 'POST') writes++; if (r.url().endsWith('/api/gika/choose-recurrence')) choices++; });
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.getByRole('button', { name: 'Sair', exact: true }).click(); await expect(page.getByLabel('E-mail')).toBeVisible();
  const code = await page.evaluate(async value => { const path = '/src/features/gika/recurrenceBridge.ts'; try { await (await import(/* @vite-ignore */ path)).chooseGikaRecurrence(value.choice, 'occurrence', value.input, value.uid, new AbortController().signal); return 'UNEXPECTED_SUCCESS'; } catch (error) { return (error as { code: string }).code; } }, { choice, input: fixture.input(), uid: fixture.uid });
  expect(code).toBe('AUTH_REQUIRED'); expect(writes).toBe(0); expect(choices).toBe(0); expect(fixture.model()).toBe(1); for (const doc of fixture.docs) expect((await doc.ref.get()).data()).toEqual(doc.data());
  await enter(page); await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click(); await expect(page.locator('.gika-message')).toHaveCount(0);
});
test('M5-T3 reload does not restore preview or execute the unconfirmed action', async ({ page }) => {
  await enter(page); const fixture = await setupSeries(page, 'Teste Gika M5T3 reload'); let writes = 0, choices = 0;
  page.on('request', r => { if (r.url().endsWith('/api/commands') && r.method() === 'POST') writes++; if (r.url().endsWith('/api/gika/choose-recurrence')) choices++; });
  const choice = await ask(page, fixture.title); await choice.getByRole('button', { name: 'Esta e as próximas', exact: true }).click(); await expect(page.getByRole('group', { name: 'Prévia da rotina', exact: true })).toBeVisible();
  expect(writes).toBe(0); expect(choices).toBe(1);
  await page.reload(); await expect(page.locator('#page-title')).toHaveText('Meu dia'); await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  await expect(page.locator('.gika-message')).toHaveCount(0); await expect(page.getByRole('group', { name: 'Prévia da rotina', exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Renomear esta e as próximas', exact: true })).toHaveCount(0);
  expect(writes).toBe(0); expect(choices).toBe(1); expect(fixture.model()).toBe(1); for (const doc of fixture.docs) expect((await doc.ref.get()).data()).toEqual(doc.data());
});
