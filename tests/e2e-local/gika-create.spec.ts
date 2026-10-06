import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Temporal } from '@js-temporal/polyfill';

async function enter(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) {
    const completed = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'profile.completeTutorial');
    await skip.click(); await completed;
  }
}
const dueDate = Temporal.Now.instant().toZonedDateTimeISO('America/Sao_Paulo').toPlainDate().add({ days: 1 }).toString();
const descriptor = (title: string) => ({ text: 'Preparando a tarefa…', simulated: false, reads: [], createTask: { title, dueDate, dueTime: null, timeZone: 'America/Sao_Paulo' } });
async function ask(page: Page, text: string) {
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill(text); await question.press('Enter'); return question;
}
for (const mobile of [false, true]) test(`E10 ${mobile ? 'mobile dark' : 'desktop light'}: structured success after actual command, task survives reload`, async ({ page }) => {
  if (mobile) { await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); }
  await enter(page);
  if (mobile) await page.evaluate(async () => { const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path); theme.applyAppearance('dark'); });
  const title = `Academia M3 ${mobile ? 'mobile' : 'desktop'}`;
  // Only model interpretation is a fixture. Auth, sendCommand, API transaction and Firestore are real emulators.
  await page.route('**/api/gika/respond', route => route.fulfill({ json: descriptor(title) }));
  const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().method() === 'POST' && response.request().postDataJSON()?.command === 'activity.create');
  await ask(page, `${title} amanhã`);
  const response = await ack; expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ result: 'applied', revision: 1 });
  expect(response.request().postDataJSON()).toMatchObject({ command: 'activity.create', expectedRevision: 0, payload: { title, schedule: { type: 'task', dueDate } } });
  const result = page.getByRole('group', { name: 'Tarefa adicionada', exact: true });
  await expect(result).toContainText(title); await expect(result).toContainText(dueDate.split('-').reverse().join('/'));
  await expect(page.locator('.gika-message.is-assistant')).toContainText('Tarefa adicionada.');
  await expect(page.locator('.gika-confirmation, .gika-undo')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.screenshot({ path: `/tmp/leve-m3-create-${mobile ? 'mobile-dark' : 'desktop-light'}.png` });
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.goto(`/hoje?dia=${dueDate}`);
  await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
  await page.reload(); await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
});

test('command failure preserves draft, never claims success, conventional agenda remains usable', async ({ page }) => {
  await enter(page);
  await page.route('**/api/gika/respond', route => route.fulfill({ json: descriptor('Falha de comando M3') }));
  await page.route('**/api/commands', route => route.fulfill({ status: 503, json: { code: 'SERVICE_RESTRICTED', message: 'Serviço temporariamente restrito.' } }));
  const question = await ask(page, 'Falha de comando M3 amanhã');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(question).toHaveValue('Falha de comando M3 amanhã');
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toHaveCount(0);
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.unroute('**/api/commands');
  await page.getByRole('link', { name: 'Calendário', exact: true }).click(); await expect(page.locator('#page-title')).toHaveText('Calendário');
});

test('unknown descriptor fields fail before any commands; generated text cannot forge creation', async ({ page }) => {
  await enter(page); let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/commands')) writes++; });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { ...descriptor('Payload inválido'), createTask: { ...descriptor('Payload inválido').createTask, uid: 'arbitrary' } } }));
  await ask(page, 'Payload inválido amanhã');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible(); expect(writes).toBe(0);
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0);
});

test('logout during upstream wait aborts creation before command dispatch', async ({ page }) => {
  await enter(page); let writes = 0; let finish: (() => Promise<void>) | undefined;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/commands')) writes++; });
  await page.route('**/api/gika/respond', route => { finish = () => route.fulfill({ json: descriptor('Tarefa tardia') }).catch(() => undefined); });
  await ask(page, 'Tarefa tardia amanhã'); await expect.poll(() => Boolean(finish)).toBe(true);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.getByRole('button', { name: 'Sair', exact: true }).click(); await finish!();
  await enter(page); await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect(page.locator('.gika-message')).toHaveCount(0); expect(writes).toBe(0);
});

test('M3-T2 double submit is one intent; identical content after success is a new intent', async ({ page }) => {
  await enter(page); const title = 'Academia dupla M3-T2'; const interpretations: string[] = []; const commands: string[] = [];
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/gika/respond', async route => {
    interpretations.push(route.request().postDataJSON().requestId);
    if (interpretations.length === 1) await gate;
    await route.fulfill({ json: descriptor(title) });
  });
  page.on('request', request => { if (request.url().endsWith('/api/commands') && request.postDataJSON()?.command === 'activity.create') commands.push(request.postDataJSON().operationId); });
  const question = await ask(page, `${title} amanhã`);
  await expect.poll(() => interpretations.length).toBe(1);
  await question.press('Enter');
  await page.getByRole('button', { name: 'Enviar pergunta', exact: true }).dispatchEvent('click');
  release();
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toHaveCount(1);
  expect(interpretations).toHaveLength(1); expect(commands).toEqual(interpretations);
  await question.fill(`${title} amanhã`); await question.press('Enter');
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toHaveCount(2);
  expect(commands).toHaveLength(2); expect(commands[0]).not.toBe(commands[1]); expect(commands).toEqual(interpretations);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`);
  await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(2);
});

test('M3-T2 acknowledgement lost after real commit: retry recovers receipt and creates no duplicate', async ({ page }) => {
  await enter(page); const title = 'Resposta perdida M3-T2'; const requests: string[] = []; const commandIds: string[] = []; const results: string[] = [];
  await page.route('**/api/gika/respond', async route => {
    requests.push(route.request().postDataJSON().requestId);
    // First call mocks only upstream interpretation; the retry reaches the real receipt recovery route.
    if (requests.length === 1) await route.fulfill({ json: descriptor(title) }); else await route.continue();
  });
  await page.route('**/api/commands', async route => {
    if (route.request().postDataJSON()?.command !== 'activity.create') { await route.continue(); return; }
    commandIds.push(route.request().postDataJSON().operationId);
    const response = await route.fetch(); expect(response.status()).toBe(200);
    results.push((await response.json()).result);
    if (commandIds.length === 1) await route.abort('failed'); else await route.fulfill({ response });
  });
  await ask(page, `${title} amanhã`);
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toContainText(title);
  expect(requests).toHaveLength(2); expect(requests[0]).toBe(requests[1]); expect(commandIds).toEqual(requests);
  expect(results).toEqual(['applied', 'alreadyApplied']);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`);
  await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
  await page.reload(); await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
});

for (const mobile of [false, true]) test(`M3-T3 ${mobile ? 'mobile dark' : 'desktop light'} exact-ID undo, pending ack, double tap, active list and conventional trash`, async ({ page }) => {
  if (mobile) { await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); }
  await enter(page);
  if (mobile) await page.evaluate(async () => { const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path); theme.applyAppearance('dark'); });
  const title = `Undo igual M3-T3 ${mobile ? 'mobile' : 'desktop'}`; let modelCalls = 0; const creations: string[] = []; const undos: string[] = [];
  await page.route('**/api/gika/respond', route => { modelCalls++; return route.fulfill({ json: descriptor(title) }); });
  page.on('request', request => { if (request.url().endsWith('/api/commands') && request.postDataJSON()?.command === 'activity.create') creations.push(request.postDataJSON().entityId); });
  const question = await ask(page, `${title} amanhã`);
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toHaveCount(1);
  await question.fill(`${title} amanhã`); await question.press('Enter');
  const cards = page.getByRole('group', { name: 'Tarefa adicionada', exact: true }); await expect(cards).toHaveCount(2);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/commands', async route => {
    if (route.request().postDataJSON()?.command !== 'activity.trash') { await route.continue(); return; }
    undos.push(route.request().postDataJSON().entityId); await gate; await route.continue();
  });
  await cards.first().getByRole('button', { name: 'Desfazer', exact: true }).click();
  const pending = cards.first().getByRole('button', { name: 'Desfazendo…', exact: true }); await expect(pending).toBeDisabled();
  await pending.dispatchEvent('click'); await expect(cards.first()).not.toContainText('Criação desfeita.');
  release(); await expect(cards.first()).toContainText('Criação desfeita.');
  await expect(cards.first().locator('.gika-create-undo [role="status"]')).toBeFocused();
  expect(undos).toEqual([creations[0]]); expect(modelCalls).toBe(2);
  await expect(cards.last().getByRole('button', { name: 'Desfazer', exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.screenshot({ path: `/tmp/leve-m3-undo-${mobile ? 'mobile-dark' : 'desktop-light'}.png` });
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`);
  await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
  await page.goto('/lixeira'); await expect(page.locator('.trash-list > li').filter({ hasText: title })).toHaveCount(1);
  await page.reload(); await page.getByRole('button', { name: 'Pergunte à Gika' }).click(); await expect(page.locator('.gika-message')).toHaveCount(0);
});

test('M3-T3 lost undo acknowledgement: same operation retry without Gemini or second effect', async ({ page }) => {
  await enter(page); const title = 'Undo resposta perdida M3-T3'; let modelCalls = 0; const undoIds: string[] = []; const results: string[] = [];
  await page.route('**/api/gika/respond', route => { modelCalls++; return route.fulfill({ json: descriptor(title) }); });
  await ask(page, `${title} amanhã`); const card = page.getByRole('group', { name: 'Tarefa adicionada', exact: true }); await expect(card).toBeVisible();
  await page.route('**/api/commands', async route => {
    if (route.request().postDataJSON()?.command !== 'activity.trash') { await route.continue(); return; }
    undoIds.push(route.request().postDataJSON().operationId);
    const response = await route.fetch(); expect(response.status()).toBe(200); results.push((await response.json()).result);
    if (undoIds.length === 1) await route.abort('failed'); else await route.fulfill({ response });
  });
  await card.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Tentar desfazer novamente', exact: true })).toBeVisible(); await expect(card).not.toContainText('Criação desfeita.');
  await card.getByRole('button', { name: 'Tentar desfazer novamente', exact: true }).click(); await expect(card).toContainText('Criação desfeita.');
  expect(modelCalls).toBe(1); expect(undoIds).toHaveLength(2); expect(undoIds[0]).toBe(undoIds[1]); expect(results).toEqual(['applied', 'alreadyApplied']);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`); await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(0);
});

test('M3-T3 later edit conflicts, user work preserved by revision precondition', async ({ page }) => {
  await enter(page); const title = 'Undo edição M3-T3'; let taskId = '';
  await page.route('**/api/gika/respond', route => route.fulfill({ json: descriptor(title) }));
  const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'activity.create');
  await ask(page, `${title} amanhã`); taskId = (await (await ack).json()).entityId;
  const card = page.getByRole('group', { name: 'Tarefa adicionada', exact: true }); await expect(card).toBeVisible();
  // Conventional edit via the same existing command API; no language-natural edit tool added.
  await page.evaluate(async ({ taskId, dueDate, title }) => {
    const path = '/src/platform/api.ts'; const { sendCommand } = await import(/* @vite-ignore */ path);
    await sendCommand({ command: 'activity.update', operationId: crypto.randomUUID(), entityId: taskId, expectedRevision: 1, payload: { title: `${title} alterada`, descriptionPlain: '', categoryId: null, colorHex: null, estimatedMinutes: null, schedule: { type: 'task', dueDate, dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' }, reminderSpecs: [] } });
  }, { taskId, dueDate, title });
  await card.getByRole('button', { name: 'Desfazer', exact: true }).click(); await expect(card).toContainText('Não foi possível desfazer porque essa tarefa foi alterada.');
  await expect(card).not.toContainText('Criação desfeita.'); await expect(card.getByRole('button')).toHaveCount(0);
  await expect(card.locator('.gika-create-undo [role="status"]')).toBeFocused();
  await page.screenshot({ path: '/tmp/leve-m3-undo-conflict.png' });
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`); await expect(page.locator('.day-activity').filter({ hasText: `${title} alterada` })).toHaveCount(1);
});

test('M3-T3 close during lost acknowledgement then reopen permits same-ID reconciliation', async ({ page }) => {
  await enter(page); const title = 'Undo fechar M3-T3'; const ids: string[] = []; let release!: () => void; let committed = false;
  await page.route('**/api/gika/respond', route => route.fulfill({ json: descriptor(title) }));
  await ask(page, `${title} amanhã`); const card = page.getByRole('group', { name: 'Tarefa adicionada', exact: true }); await expect(card).toBeVisible();
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/commands', async route => {
    if (route.request().postDataJSON()?.command !== 'activity.trash') { await route.continue(); return; }
    ids.push(route.request().postDataJSON().operationId); const response = await route.fetch();
    if (ids.length === 1) { committed = true; await gate; }
    await route.fulfill({ response }).catch(() => undefined);
  });
  await card.getByRole('button', { name: 'Desfazer', exact: true }).click(); await expect.poll(() => committed).toBe(true);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); release();
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await card.getByRole('button', { name: 'Tentar desfazer novamente', exact: true }).click(); await expect(card).toContainText('Criação desfeita.');
  expect(ids).toHaveLength(2); expect(ids[0]).toBe(ids[1]);
});

test('production OUT_OF_SCOPE follow-up creates academia tomorrow 19:00 through actual command ack',async({page})=>{
  await enter(page);
  const current='então agende para amanhã ir à academia às 7 horas da noite';
  const commands:string[]=[];
  page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/commands'))commands.push(request.url());});
  await page.route('**/api/gika/respond',async route=>{
    const input=route.request().postDataJSON();
    if(input.text!==current)return route.fulfill({json:{text:'Eu fico focada na sua agenda e organização no Leve.',intent:'conversation',domainIntent:'OUT_OF_SCOPE',simulated:false,reads:[]}});
    expect(input.conversation).toEqual([{role:'user',text:'gera um código em Python para mim'},{role:'assistant',text:'Eu fico focada na sua agenda e organização no Leve.'}]);
    const {normalizeCurrentAction,resolveCreationIntent}=await import('../../server/gika/createPolicy');
    const today=Temporal.PlainDate.from(dueDate).subtract({days:1}).toString(),context={today,timeZone:'America/Sao_Paulo',weekStartsOn:1 as const};
    const normalized=normalizeCurrentAction({kind:'create_task',sourceText:current,requestExpression:'então agende',title:'ir à academia',dateExpression:'amanhã',timeExpression:'às 7 horas da noite'},current,context)!;
    const task=resolveCreationIntent(normalized,context).task!;
    expect(task).toMatchObject({title:'ir à academia',dueDate,dueTime:'19:00'});
    return route.fulfill({json:{text:'Preparando a tarefa…',intent:'agenda_action',domainIntent:'AGENDA_ACTION',simulated:false,reads:[],createTask:task}});
  });
  const composer=await ask(page,'gera um código em Python para mim');
  await expect(page.locator('.gika-content')).toContainText('Eu fico focada');expect(commands).toEqual([]);
  const ack=page.waitForResponse(response=>response.url().endsWith('/api/commands')&&response.request().postDataJSON()?.command==='activity.create');
  await composer.fill(current);await composer.press('Enter');
  const applied=await ack;expect(applied.status()).toBe(200);expect(await applied.json()).toMatchObject({result:'applied',revision:1});
  expect(applied.request().postDataJSON()).toMatchObject({command:'activity.create',expectedRevision:0,payload:{title:'ir à academia',schedule:{dueDate,dueTime:'19:00'}}});
  await expect(page.getByRole('group',{name:'Tarefa adicionada',exact:true})).toContainText('ir à academia');expect(commands).toHaveLength(1);
  await page.getByRole('button',{name:'Fechar Gika'}).click();await page.goto(`/hoje?dia=${dueDate}`);await page.reload();
  await expect(page.locator('.day-activity').filter({hasText:'ir à academia'})).toHaveCount(1);
});
