import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
  if (await skip.isVisible()) await skip.click();
}
const read = { startDate: '2026-10-01', endDate: '2026-10-01', timeZone: 'America/Sao_Paulo', partial: false, cached: false, items: [{ id: 'fixture-task', revision: 1, title: 'Leitura <script>não executar</script>', kind: 'task', status: 'pending', schedule: { type: 'task', dueDate: '2026-10-01', dueTime: '09:00', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' }, seriesId: null, occurrenceKey: null }] };

test('missing env real: fallback preserva draft e agenda convencional', async ({ page }) => {
  await enter(page);
  let result: { status: number; code: string } | undefined;
  page.on('response', async response => { if (response.url().endsWith('/api/gika/respond')) result = { status: response.status(), code: (await response.json()).code }; });
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('O que tenho hoje?'); await question.press('Enter');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  expect(result).toEqual({ status: 503, code: 'GIKA_NOT_CONFIGURED' });
  await expect(question).toHaveValue('O que tenho hoje?');
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('link', { name: 'Calendário', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Calendário');
  await page.getByRole('link', { name: 'Nova atividade', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Agenda continua disponível');
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Agenda continua disponível');
});

test('contrato real mostra tool result escapado, sem confirmação/undo ou commands', async ({ page }) => {
  await enter(page);
  const commands: string[] = []; page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/commands')) commands.push(request.url()); });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Veja sua agenda para o período consultado.', simulated: false, reads: [read] } }));
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await page.getByRole('button', { name: 'O que tenho hoje?', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar pergunta' }).click();
  const result = page.getByRole('region', { name: 'Agenda de 01/10/2026' });
  await expect(result).toBeVisible(); await expect(result).toContainText(read.items[0]!.title);
  await expect(result).toContainText('09:00');
  await expect(page.locator('.gika-panel script')).toHaveCount(0);
  await expect(page.locator('.gika-confirmation, .gika-undo')).toHaveCount(0);
  expect(commands).toEqual([]);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
});

test('mobile dark: partial/empty honestos, composer fixo e scroll separado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await enter(page);
  await page.evaluate(async () => { const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path); theme.applyAppearance('dark'); });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Esta consulta mostra parte da sua agenda.', simulated: false, reads: [{ ...read, partial: true, items: [] }] } }));
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('Minha semana'); await question.press('Enter');
  await expect(page.locator('.gika-result')).toContainText('Consulta parcial');
  await expect(page.locator('.gika-result')).toContainText('Não há itens nesta parte da consulta.');
  await expect(page.locator('.gika-result')).not.toContainText('Nada planejado');
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('.gika-panel')!; const composer = document.querySelector('.gika-composer')!; const content = document.querySelector('.gika-content')!;
    return { panelWidth: panel.clientWidth, scrollWidth: panel.scrollWidth, bottom: composer.getBoundingClientRect().bottom, height: innerHeight, overflow: getComputedStyle(content).overflowY };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.panelWidth + 1); expect(layout.bottom).toBeLessThanOrEqual(layout.height); expect(layout.overflow).toBe('auto');
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/leve-m2-mobile-readonly.png' });
});

test('429 e saída com command/preview real rejeitadas sem mutar', async ({ page }) => {
  await enter(page); let attempt = 0; const commands: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/commands')) commands.push(request.url()); });
  await page.route('**/api/gika/respond', route => { attempt++; return route.fulfill(attempt === 1 ? { status: 429, json: { code: 'GIKA_QUOTA', message: 'Quota' } } : { json: { text: 'Tarefa criada.', simulated: false, reads: [], command: 'activity.create', preview: 'organize-demo' } }); });
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }); await question.fill('Adicionar uma tarefa'); await question.press('Enter');
  await expect(page.locator('.gika-feedback')).toContainText('limite de consultas');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.locator('.gika-feedback')).toContainText('Não consegui responder');
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0); await expect(page.locator('.gika-message.is-user')).toHaveCount(1);
  await expect(question).toHaveValue('Adicionar uma tarefa'); expect(commands).toEqual([]);
});

test('API cancelada ao fechar/sair não publica resposta na segunda conta', async ({ page }) => {
  await enter(page);
  let finish: (() => Promise<void>) | undefined;
  await page.route('**/api/gika/respond', route => { finish = () => route.fulfill({ json: { text: 'Resposta privada tardia', simulated: false, reads: [read] } }).catch(() => undefined); });
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('Pergunta privada anterior'); await question.press('Enter');
  await expect.poll(() => Boolean(finish)).toBe(true);
  await expect(page.locator('.gika-loading')).toContainText('Preparando uma resposta');
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await finish!();
  await page.goto('/registrar');
  await page.getByLabel('Seu nome').fill('Conta read-only fictícia');
  await page.getByLabel('E-mail').fill(`gika.readonly.${Date.now()}@example.test`);
  await page.getByLabel('Senha', { exact: true }).fill('gika-local-123');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('gika-local-123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar neste ambiente' }).click();
  await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  await page.getByRole('button', { name: 'Pular guia', exact: true }).click();
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect(question).toHaveValue('');
  await expect(page.locator('.gika-message')).toHaveCount(0);
  await expect(page.getByText('Resposta privada tardia', { exact: true })).toHaveCount(0);
});

test('E70: 503, timeout e resposta inválida permitem consultar calendário após fallback', async ({ page }) => {
  await enter(page); let code = 'GIKA_UNAVAILABLE';
  await page.route('**/api/gika/respond', route => route.fulfill({ status: code === 'GIKA_TIMEOUT' ? 504 : 503, json: { code, message: 'Não consegui falar com a Gika agora. Sua agenda continua disponível.' } }));
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  for (code of ['GIKA_UNAVAILABLE', 'GIKA_TIMEOUT', 'GIKA_INVALID_RESPONSE', 'GIKA_MALFORMED_CALL']) {
    await question.fill('O que tenho hoje?'); await question.press('Enter');
    await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
    await expect(question).toHaveValue('O que tenho hoje?');
    await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('link', { name: 'Calendário', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Calendário');
});

 test('conversation keeps bounded minimal agenda context without mutation or timezone microcopy', async ({page}) => {
   await enter(page);
   const requests: Record<string,unknown>[]=[]; const commands:string[]=[];
   page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/commands'))commands.push(request.url());});
   await page.route('**/api/gika/respond',route=>{
     const input=route.request().postDataJSON();requests.push(input);
     return route.fulfill({json:input.text==='O que tenho hoje?'?{text:'Veja sua agenda.',intent:'agenda_query',simulated:false,reads:[read]}:{text:input.text==='Oi'?'Oi! Como posso te ajudar?':'Posso conversar e ajudar com a agenda.',intent:'conversation',simulated:false,reads:[]}});
   });
   await page.getByRole('button',{name:'Pergunte à Gika'}).click();
   const composer=page.getByRole('textbox',{name:'Pergunte à Gika',exact:true});
   await composer.fill('Oi');await composer.press('Enter');
   await expect(page.locator('.gika-content')).toContainText('Oi! Como posso te ajudar?');
   expect(requests[0]).not.toHaveProperty('conversation');
   await composer.fill('O que tenho hoje?');await composer.press('Enter');
   await expect(page.locator('.gika-result')).toBeVisible();
   expect(requests[1]!.conversation).toEqual([{role:'user',text:'Oi'},{role:'assistant',text:'Oi! Como posso te ajudar?'}]);
   await expect(page.locator('.gika-panel')).not.toContainText('Horários em');
   await expect(page.locator('#gika-voice-privacy')).toHaveCount(0);
   await composer.fill('Como você pode ajudar?');await composer.press('Enter');
   await expect(composer).toHaveValue('');
   expect(requests[2]!.conversation).toHaveLength(4);
   const projected = JSON.stringify(requests[2]!.conversation);
   expect(projected).toContain(read.items[0]!.title);
   expect(projected).not.toContain(read.items[0]!.id);
   expect(projected).not.toContain('revision');
   expect(projected).not.toContain('seriesId');
   expect(projected).not.toContain('confirmationToken');
   expect(commands).toEqual([]);
   expect((await new AxeBuilder({page}).include('.gika-panel').analyze()).violations).toEqual([]);
   await page.getByRole('button',{name:'Fechar Gika'}).click();
   await page.getByRole('button',{name:'Sair',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Entre na sua agenda',exact:true})).toBeVisible();
   await enter(page);
   await page.getByRole('button',{name:'Pergunte à Gika'}).click();
   await composer.fill('Oi');await composer.press('Enter');
   await expect(page.locator('.gika-content')).toContainText('Oi! Como posso te ajudar?');
   expect(requests[3]).not.toHaveProperty('conversation');
 });

test('domain-bounded conversation redirects general knowledge without agenda commands', async ({page}) => {
  await enter(page);
  const commands:string[]=[];
  page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/commands'))commands.push(request.url());});
  const replies:Record<string,{domainIntent:string;text:string}>={
    'Oi':{domainIntent:'SOCIAL',text:'Oi! Como posso te ajudar com sua agenda?'},
    'Me ensine Python':{domainIntent:'OUT_OF_SCOPE',text:'Eu fico focada na sua agenda e organização no Leve. Posso ajudar a reservar um horário de estudo ou adicionar uma tarefa à sua agenda.'},
    'Quem é você?':{domainIntent:'GIKA_META',text:'Sou a Gika. Ajudo você com sua agenda e organização no Leve.'},
    'Meu dia está uma bagunça':{domainIntent:'ORGANIZATION_CONVERSATION',text:'Podemos começar escolhendo uma prioridade para hoje.'},
  };
  await page.route('**/api/gika/respond',route=>{
    const text=route.request().postDataJSON().text;
    return route.fulfill({json:{...replies[text],intent:'conversation',simulated:false,reads:[]}});
  });
  await page.getByRole('button',{name:'Pergunte à Gika'}).click();
  const composer=page.getByRole('textbox',{name:'Pergunte à Gika',exact:true});
  for(const [text,reply] of Object.entries(replies)){
    await composer.fill(text);await composer.press('Enter');
    await expect(page.locator('.gika-message.is-assistant').last()).toContainText(reply.text);
  }
  expect(commands).toEqual([]);
  await expect(page.locator('.gika-panel')).not.toContainText('Horários em');
  await expect(page.locator('#gika-voice-privacy')).toHaveCount(0);
  expect((await new AxeBuilder({page}).include('.gika-panel').analyze()).violations).toEqual([]);
});
