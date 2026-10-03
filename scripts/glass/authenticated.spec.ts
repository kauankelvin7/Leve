import { test, expect, type Page } from '@playwright/test';
import { Temporal } from '@js-temporal/polyfill';
import { isolatedTestAccount } from '../../tests/helpers/gikaBatch';
let fixtureEmail = 'leve.local@example.test';
const fixtureDay = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
import { inspect, instrument, viewports, setAppearance } from './probe';
async function login(page: Page) {
  await page.goto('/entrar'); await page.getByLabel('E-mail').fill(fixtureEmail); await page.getByLabel('Senha',{exact:true}).fill('leve-local-123'); await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Finalize sua agenda|Meu dia/})).toBeVisible();
  if (await page.getByRole('heading',{name:'Finalize sua agenda'}).count()) await page.getByRole('button',{name:'Criar minha agenda'}).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button',{name:'Pular guia',exact:true}); await skip.waitFor({state:'visible',timeout:3000}).catch(()=>undefined); if(await skip.isVisible()) await skip.click();
}
// Exercise the app's real client navigation instead of repeatedly reloading the
// entire Vite module graph in one renderer (first traces: ERR_INSUFFICIENT_RESOURCES).
async function navigate(page: Page, route: string) {
  const link = page.locator(`a[href="${route}"]:visible`).first();
  if (await link.count()) await link.click(); else await page.goto(route);
}
let detailRoutes: string[] = [];
test.beforeAll(async ({ browser }) => {
  fixtureEmail = await isolatedTestAccount('glass'); detailRoutes = [];
  const page = await browser.newPage({baseURL:'http://localhost:5174'}); await login(page);
  await page.getByRole('button',{name:'Nova atividade',exact:true}).click();
  await page.getByLabel('Título',{exact:true}).fill('Glass synthetic activity');
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  await page.getByLabel('Data',{exact:true}).fill(today); await page.getByRole('button',{name:'Adicionar atividade',exact:true}).click();
  const activity = page.getByRole('link',{name:'Glass synthetic activity',exact:true}); await expect(activity).toBeVisible(); detailRoutes.push((await activity.getAttribute('href'))!);
  await navigate(page,'/notas'); await page.getByLabel('Título',{exact:true}).fill('Glass synthetic note'); await page.getByLabel('Texto',{exact:true}).fill('Conteúdo sintético para verificar a leitura.'); const savedNote = page.waitForRequest(request => request.url().endsWith('/api/commands') && request.postDataJSON()?.command === 'note.save'); await page.getByRole('button',{name:'Salvar nota',exact:true}).click(); const noteId = (await savedNote).postDataJSON().entityId as string; detailRoutes.push(`/notas/${noteId}`);
  await expect(page.getByRole('heading',{name:'Glass synthetic note',exact:true})).toBeVisible();
  await navigate(page,'/compras'); await page.getByLabel('Nome da lista').fill('Glass synthetic list'); await page.getByRole('button',{name:'Criar lista',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Glass synthetic list',exact:true})).toBeVisible(); detailRoutes.push(new URL(page.url()).pathname);
  await page.getByLabel('Adicionar item',{exact:true}).fill('Arroz sintético'); await page.getByRole('button',{name:'Adicionar item',exact:true}).click(); await expect(page.getByText('Arroz sintético',{exact:true})).toBeVisible();
  await navigate(page,'/notas'); await page.getByLabel('Título',{exact:true}).fill('Glass synthetic trash'); await page.getByLabel('Texto',{exact:true}).fill('Item sintético para o diálogo.'); await page.getByRole('button',{name:'Salvar nota',exact:true}).click(); await expect(page.getByRole('heading',{name:'Glass synthetic trash',exact:true})).toBeVisible(); await page.locator('article').filter({hasText:'Glass synthetic trash'}).getByRole('button',{name:'Mover para lixeira',exact:true}).click(); await expect(page.getByRole('heading',{name:'Glass synthetic trash',exact:true})).toHaveCount(0);
  await page.goto(`/hoje?dia=${fixtureDay}&nova=1`); await page.getByLabel('Tipo').selectOption('event'); await page.getByLabel('Título',{exact:true}).fill('Glass synthetic recurrence'); await page.getByLabel('Início',{exact:true}).fill(fixtureDay); await page.getByLabel('Horário inicial',{exact:true}).fill('10:00'); await page.getByLabel('Fim',{exact:true}).fill(fixtureDay); await page.getByLabel('Horário final',{exact:true}).fill('11:00'); await page.locator('.activity-composer .optional-fields > summary').click(); await page.getByLabel('Frequência').selectOption('weekly'); await page.getByLabel(/Até/).fill(Temporal.PlainDate.from(fixtureDay).add({ weeks: 1 }).toString()); await page.getByRole('button',{name:'Adicionar atividade',exact:true}).click(); await expect(page.getByText('Glass synthetic recurrence',{exact:true}).first()).toBeVisible();
  await page.close();
});
for (const [width,height] of viewports) for (const appearance of ['light','dark'] as const) {
  test(`authenticated ${width} ${appearance}`, async ({ page }) => {
    await page.setViewportSize({width,height}); await instrument(page); await page.emulateMedia({reducedMotion:'reduce',colorScheme:appearance}); await login(page);
    const routes = ['/hoje','/calendario','/notas','/compras','/revisao','/buscar','/configuracoes','/lixeira',...detailRoutes];
    for (const [index,route] of routes.entries()) {
      await navigate(page,route); await expect(page.locator('#page-title')).toBeVisible();
      await setAppearance(page,appearance);
      await inspect(page, `auth-route${index}-${width}-${appearance}`);
    }
    await page.goto('/hoje'); await page.getByRole('button',{name:'Nova atividade',exact:true}).click(); await expect(page.getByLabel('Título',{exact:true})).toBeVisible(); await setAppearance(page,appearance); await inspect(page,`activity-form-${width}-${appearance}`);
    await page.goto('/hoje'); await page.getByRole('button',{name:'Pergunte à Gika',exact:true}).click();
    await expect(page.locator('.gika-panel')).toBeVisible(); await expect(page.locator('.gika-welcome')).toHaveCount(1); await expect(page.locator('#gika-title')).toHaveCount(1); await expect(page.locator('.gika-panel .gika-character')).toHaveCount(1);
    await setAppearance(page,appearance); await inspect(page,`gika-welcome-header-${width}-${appearance}`);
    await page.route('**/api/gika/respond',route=>route.fulfill({json:{text:'Consulta sintética para verificar a leitura.',simulated:false,reads:[]}}));
    let chatCommands=0; const countCommands=(request: import('@playwright/test').Request)=>{if(request.method()==='POST' && request.url().endsWith('/api/commands'))chatCommands++;}; page.on('request',countCommands);
    await page.getByRole('textbox',{name:'Pergunte à Gika',exact:true}).fill('Minha agenda'); await page.getByRole('button',{name:'Enviar pergunta',exact:true}).click(); await expect(page.getByRole('list',{name:'Mensagens da conversa'}).getByText('Consulta sintética para verificar a leitura.',{exact:true})).toBeVisible();
    await expect(page.locator('.gika-welcome')).toHaveCount(0); await expect(page.locator('.gika-panel .gika-character')).toHaveCount(1); expect(chatCommands).toBe(0); page.off('request',countCommands);
    await inspect(page,`gika-active-chat-${width}-${appearance}`); await page.getByRole('button',{name:'Fechar Gika',exact:true}).click(); await expect(page.locator('.gika-panel')).not.toBeVisible();
    await page.getByRole('button',{name:'Pergunte à Gika',exact:true}).click(); await expect(page.locator('.gika-panel .gika-character')).toHaveCount(1); await page.getByRole('button',{name:'Fechar Gika',exact:true}).click(); await inspect(page,`gika-closed-lifecycle-${width}-${appearance}`);
  });
}
for (const mode of ['text200','solid','forcedColors','highContrast','reducedTransparency'] as const) test(`accessibility ${mode}`, async ({page})=>{
  await page.setViewportSize({width:390,height:844}); await login(page);
  if (mode === 'solid' || mode === 'highContrast') {
    await page.goto('/configuracoes'); await page.getByLabel(mode==='solid'?'Reduzir transparência':'Aumentar contraste',{exact:true}).check(); await page.getByRole('button',{name:'Salvar preferências'}).click(); await expect(page.locator('.form-status')).toHaveText('Preferências salvas.');
  }
  if(mode==='forcedColors') await page.emulateMedia({forcedColors:'active'});
  if(mode==='reducedTransparency') { const cdp=await page.context().newCDPSession(page); await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]}); }
  for(const route of ['/hoje','/calendario','/notas','/compras','/revisao','/buscar','/configuracoes','/lixeira',...detailRoutes]) {
    await navigate(page,route); await expect(page.locator('#page-title')).toBeVisible(); if(mode==='text200') await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    await inspect(page,`${mode}-${route.replaceAll('/','-')}`, ['solid','forcedColors','reducedTransparency'].includes(mode));
  }
  if(mode==='solid'||mode==='highContrast') { await page.goto('/configuracoes'); await page.getByLabel(mode==='solid'?'Reduzir transparência':'Aumentar contraste',{exact:true}).uncheck(); await page.getByRole('button',{name:'Salvar preferências'}).click(); await expect(page.locator('.form-status')).toHaveText('Preferências salvas.'); }
});
for (const [width,height] of viewports) for (const appearance of ['light','dark'] as const) test(`timer and confirmation ${width} ${appearance}`,async({page})=>{
  await page.setViewportSize({width,height}); await login(page); await page.goto(detailRoutes[0]!); await setAppearance(page,appearance);
  await page.getByRole('button',{name:'Iniciar cronômetro',exact:true}).click(); await expect(page.getByRole('button',{name:'Pausar cronômetro',exact:true}).first()).toBeVisible();
  await expect(page.locator('.active-timer-bar')).toBeVisible(); await inspect(page,`active-timer-${width}-${appearance}`);
  await page.getByRole('button',{name:'Pausar cronômetro',exact:true}).first().click(); await expect(page.locator('.active-timer-bar')).toHaveCount(0); await expect(page.getByRole('status').filter({hasText:'Cronômetro pausado.'})).toBeVisible();
  await page.getByRole('button',{name:'Retomar',exact:true}).click(); await expect(page.locator('.active-timer-bar')).toBeVisible();
  await page.getByRole('button',{name:'Encerrar cronômetro',exact:true}).click(); await expect(page.locator('.active-timer-bar')).toHaveCount(0);
  await page.goto('/lixeira'); await setAppearance(page,appearance); await page.getByRole('button',{name:'Excluir tudo',exact:true}).click(); await expect(page.locator('.confirm-dialog')).toBeVisible(); await inspect(page,`confirmation-${width}-${appearance}`); await page.getByRole('button',{name:'Manter na lixeira',exact:true}).click();
});

for (const [width,height] of viewports) for (const appearance of ['light','dark'] as const) test(`recurrence ${width} ${appearance}`,async({page})=>{
  await page.setViewportSize({width,height}); await login(page); await page.goto('/calendario'); await setAppearance(page,appearance); await page.getByRole('button',{name:'Dia',exact:true}).click(); await page.getByLabel('Data',{exact:true}).fill(fixtureDay);
  await expect(page.locator('.calendar-time-column')).toHaveCount(1);
  await page.locator('.calendar-time-scroll').evaluate(element=>element.scrollTop=450);
  const event=page.locator('.calendar-time-event').filter({hasText:'Glass synthetic recurrence'}).first(); await expect(event).toBeVisible(); await event.hover();
  const handle=event.locator('.calendar-time-move-handle'); const box=await handle.boundingBox(); expect(box).not.toBeNull();
  const target=await page.locator('.calendar-time-column').evaluate(element=>{const r=element.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+660};});
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2); await page.mouse.down(); await page.mouse.move(target.x,target.y,{steps:8}); await page.mouse.up();
  await expect(page.locator('.calendar-recurrence-dialog')).toBeVisible(); await inspect(page,`recurrence-${width}-${appearance}`); await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click(); await expect(page.locator('.calendar-recurrence-dialog')).not.toBeVisible();
});
