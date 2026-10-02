import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createBatchFixture, batchSourceDate, batchDestinationDate, batchTask, batchReceipt } from '../helpers/gikaBatch';
import { batchOperationId, batchPlanSchema, type BatchConfirmation } from '../../packages/domain/src/gikaBatch';
import { issueBatchConfirmation } from '../../server/gika/confirmation';

async function enter(page:Page){
  await page.goto('/entrar');await page.getByLabel('E-mail').fill('leve.local@example.test');await page.getByLabel('Senha',{exact:true}).fill('leve-local-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if(await page.getByRole('heading',{name:'Finalize sua agenda'}).count())await page.getByRole('button',{name:'Criar minha agenda'}).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');const skip=page.getByRole('button',{name:'Pular guia',exact:true});await skip.waitFor({state:'visible',timeout:3000}).catch(()=>undefined);if(await skip.isVisible())await skip.click();
}
// UI contract fixture only; router/model minimization and civil dates are proved in integration.
async function fixture(page:Page,period:'day'|'week'='day'){
  const base=await createBatchFixture(page,'Teste Gika organização','reschedule');
  await page.unroute('**/api/gika/respond');
  let calls=0,confirmation:BatchConfirmation|undefined;
  await page.route('**/api/gika/respond',async route=>{
    calls++;const request=route.request().postDataJSON();
    const snapshots=base.original.map(item=>({id:item.id,data:item.data!})).sort((a,b)=>a.id.localeCompare(b.id));
    const organization={period,startDate:batchSourceDate,endDate:batchDestinationDate,items:snapshots.map(item=>({id:item.id,title:item.data.title,revision:item.data.revision,timeZone:item.data.schedule.timeZone,before:{dueDate:batchSourceDate,dueTime:item.data.schedule.dueTime},after:{dueDate:item.id===base.excluded.id?batchSourceDate:batchDestinationDate,dueTime:item.data.schedule.dueTime},action:item.id===base.excluded.id?'keep':'move',recurring:false}))};
    const changes=organization.items.filter(item=>item.action==='move');
    const items=await Promise.all(changes.map(async(item,index)=>({operationId:await batchOperationId(base.uid,request.requestId,index),id:item.id,title:item.title,revision:item.revision,timeZone:item.timeZone,before:item.before,patch:{dueDate:item.after.dueDate},scope:'none'})));
    confirmation=issueBatchConfirmation(base.uid,request,batchPlanSchema.parse({action:'reschedule',sourceDate:batchSourceDate,items,organization}));
    await route.fulfill({json:{text:'Sugestão para organizar suas tarefas. Confira as mudanças antes de confirmar.',simulated:false,reads:[],batchConfirmation:confirmation}});
  });
  return {...base,calls:()=>calls,preview:()=>confirmation!};
}
async function ask(page:Page,period='dia'){
  await page.getByRole('button',{name:'Pergunte à Gika',exact:true}).click();const input=page.getByRole('textbox',{name:'Pergunte à Gika',exact:true});await input.fill(`Organiza meu ${period}`);await input.press('Enter');
  const card=page.getByRole('group',{name:'Prévia do lote',exact:true});await expect(card).toBeVisible();return card;
}
test('M6 daily preview cancellation is terminal and preserves every task',async({page})=>{
  await enter(page);const f=await fixture(page);let commands=0;page.on('request',r=>{if(r.url().endsWith('/api/commands'))commands++;});const card=await ask(page);
  await expect(card).toContainText(f.excluded.title);await card.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(card).toHaveAttribute('data-batch-state','cancelled');expect(commands).toBe(0);expect(f.calls()).toBe(1);
  for(const item of f.original)expect(await batchTask(f.uid,item.id)).toEqual(item.data);
});
test('M6 daily confirm waits for real final ack, preserves kept tasks, accessible mobile dark',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await enter(page);await page.evaluate(async()=>{const path='/src/platform/theme.ts';(await import(/* @vite-ignore */path)).applyAppearance('dark');});const f=await fixture(page);
  let committed=false,release!:()=>void;const hold=new Promise<void>(r=>{release=r;});let commands=0;
  await page.route('**/api/commands',async route=>{commands++;const response=await route.fetch();expect(response.status()).toBe(200);if(commands===2){committed=true;await hold;}await route.fulfill({response});});
  const card=await ask(page);expect((await new AxeBuilder({page}).include('.gika-panel').analyze()).violations).toEqual([]);await card.getByRole('button',{name:'Reorganizar 2 tarefas',exact:true}).click();await expect.poll(()=>committed).toBe(true);await expect(card).toHaveAttribute('data-batch-state','confirming');await expect(page.getByRole('group',{name:'Lote concluído',exact:true})).toHaveCount(0);release();await expect(page.getByRole('group',{name:'Lote concluído',exact:true})).toHaveAttribute('data-batch-state','confirmed');expect(commands).toBe(2);expect(f.calls()).toBe(1);
  for(const item of f.preview().plan.items){expect(await batchTask(f.uid,item.id)).toMatchObject({revision:2,schedule:{dueDate:batchDestinationDate,dueTime:item.before.dueTime}});expect((await batchReceipt(f.uid,item.operationId))?.response.entityId).toBe(item.id);}
  expect(await batchTask(f.uid,f.excluded.id)).toEqual(f.original.find(item=>item.id===f.excluded.id)!.data);
});
for(const variant of ['stale','tamper'] as const)test(`M6 ${variant} blocks organization without broadened effect`,async({page})=>{
  await enter(page);const f=await fixture(page);const card=await ask(page);
  if(variant==='stale'){
    const id=f.excluded.id;
    await page.evaluate(async value=>{const path='/src/platform/api.ts';await(await import(/* @vite-ignore */path)).sendCommand({command:'activity.setStatus',operationId:crypto.randomUUID(),entityId:value,expectedRevision:1,payload:{status:'completed'}});},id);
  }else await page.route('**/api/commands',async route=>{const command=route.request().postDataJSON();const response=await route.fetch({postData:{...command,payload:{dueDate:batchSourceDate}}});expect(response.status()).toBe(422);await route.fulfill({response});});
  await card.getByRole('button',{name:'Reorganizar 2 tarefas',exact:true}).click();await expect(card).toHaveAttribute('data-batch-state',variant==='stale'?'conflict':'failed');
  for(const item of f.selected)expect(await batchTask(f.uid,item.id)).toMatchObject({revision:1,schedule:{dueDate:batchSourceDate}});expect(f.calls()).toBe(1);
});
test('M6 partial read reports incompleteness without an executable preview',async({page})=>{
  await enter(page);let commands=0;page.on('request',r=>{if(r.url().endsWith('/api/commands'))commands++;});await page.route('**/api/gika/respond',route=>route.fulfill({json:{text:'Esta consulta está incompleta. Não posso propor uma organização completa.',simulated:false,reads:[]}}));
  await page.getByRole('button',{name:'Pergunte à Gika',exact:true}).click();const input=page.getByRole('textbox',{name:'Pergunte à Gika',exact:true});await input.fill('Organiza meu dia');await input.press('Enter');await expect(page.locator('.gika-message.is-assistant')).toContainText('consulta está incompleta');await expect(page.locator('.gika-confirmation')).toHaveCount(0);expect(commands).toBe(0);
});
test('M6 offline preserves draft and cannot propose or execute after reconnect',async({page,context})=>{
  await enter(page);let requests=0;page.on('request',r=>{if(/\/api\/(gika|commands)/u.test(r.url()))requests++;});await page.getByRole('button',{name:'Pergunte à Gika',exact:true}).click();const input=page.getByRole('textbox',{name:'Pergunte à Gika',exact:true});await input.fill('Organiza meu dia');await context.setOffline(true);
  await expect(page.getByRole('button',{name:'Enviar pergunta',exact:true})).toBeDisabled();await expect(input).toHaveValue('Organiza meu dia');await expect(page.locator('.gika-panel')).toContainText('precisa de conexão');await expect(page.locator('#page-title')).toHaveText('Meu dia');await context.setOffline(false);await expect(page.getByRole('button',{name:'Enviar pergunta',exact:true})).toBeEnabled();expect(requests).toBe(0);
});
test('M6 logout invalidates prior organization without dispatch',async({page})=>{
  await enter(page);const f=await fixture(page);await ask(page);let commands=0;page.on('request',r=>{if(r.url().endsWith('/api/commands'))commands++;});await page.getByRole('button',{name:'Fechar Gika',exact:true}).click();await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.getByLabel('E-mail')).toBeVisible();expect(commands).toBe(0);for(const item of f.original)expect(await batchTask(f.uid,item.id)).toEqual(item.data);
});

test('M6 editing a new request invalidates the old preview before confirmation',async({page})=>{
  await enter(page);await fixture(page);const card=await ask(page);let commands=0;page.on('request',r=>{if(r.url().endsWith('/api/commands'))commands++;});await page.getByRole('textbox',{name:'Pergunte à Gika',exact:true}).fill('Outra intenção');await expect(card).toHaveAttribute('data-batch-state','cancelled');await expect(card.getByRole('button')).toHaveCount(0);expect(commands).toBe(0);
});
