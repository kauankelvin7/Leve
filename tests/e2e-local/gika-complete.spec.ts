import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Temporal } from '@js-temporal/polyfill';
const dueDate=Temporal.Now.instant().toZonedDateTimeISO('America/Sao_Paulo').toPlainDate().toString();
async function enter(page:Page){
  await page.goto('/entrar');await page.getByLabel('E-mail').fill('leve.local@example.test');await page.getByLabel('Senha',{exact:true}).fill('leve-local-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if(await page.getByRole('heading',{name:'Finalize sua agenda'}).count())await page.getByRole('button',{name:'Criar minha agenda'}).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');const skip=page.getByRole('button',{name:'Pular guia',exact:true});await skip.waitFor({state:'visible',timeout:3000}).catch(()=>undefined);
  if(await skip.isVisible()){const ack=page.waitForResponse(r=>r.url().endsWith('/api/commands')&&r.request().postDataJSON()?.command==='profile.completeTutorial');await skip.click();await ack;}
}
async function create(page:Page,title:string){return page.evaluate(async ({title,dueDate})=>{
  const path='/src/platform/api.ts';const {sendCommand}=await import(/* @vite-ignore */ path);const id=crypto.randomUUID();
  await sendCommand({command:'activity.create',operationId:crypto.randomUUID(),entityId:id,expectedRevision:0,payload:{title,descriptionPlain:'',categoryId:null,colorHex:null,estimatedMinutes:null,reminderSpecs:[],schedule:{type:'task',dueDate,dueTime:null,timeZone:'America/Sao_Paulo',disambiguation:'reject'}}});return id;
},{title,dueDate});}
const descriptor=(id:string,title:string)=>({text:'Preparando a conclusão…',simulated:false,reads:[],completeTask:{id,title,dueDate,timeZone:'America/Sao_Paulo',revision:1}});
async function ask(page:Page,title:string){await page.getByRole('button',{name:'Pergunte à Gika'}).click();const q=page.getByRole('textbox',{name:'Pergunte à Gika',exact:true});await q.fill(`Terminei ${title}`);await q.press('Enter');return q;}
for(const mobile of [false,true])test(`M4-T1 ${mobile?'mobile dark':'desktop light'} completion card only after real ack, exact target and double submit`,async({page})=>{
  if(mobile){await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});}await enter(page);
  if(mobile)await page.evaluate(async()=>{const path='/src/platform/theme.ts';(await import(/* @vite-ignore */ path)).applyAppearance('dark');});
  const title=`Academia M4 ${mobile?'mobile':'desktop'}`,id=await create(page,title);let calls=0;const commands:string[]=[];
  // Descriptor is a fixture; resolution/security are independently proven by real integration.
  await page.route('**/api/gika/respond',route=>{calls++;return route.fulfill({json:descriptor(id,title)});});
  let release!:()=>void,committed=false;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/commands',async route=>{const c=route.request().postDataJSON();expect(c.command).toBe('activity.setStatus');expect(c.entityId).toBe(id);expect(c.expectedRevision).toBe(1);expect(c.payload).toEqual({status:'completed'});commands.push(c.operationId);const response=await route.fetch();expect(response.status()).toBe(200);committed=true;await gate;await route.fulfill({response});});
  const q=await ask(page,title);await expect.poll(()=>committed).toBe(true);
  const card=page.getByRole('group',{name:'Tarefa concluída',exact:true});await expect(card).toHaveCount(0);await q.press('Enter');await page.getByRole('button',{name:'Enviar pergunta',exact:true}).dispatchEvent('click');
  release();await expect(card).toContainText(title);await expect(page.locator('.gika-message.is-assistant')).toContainText('Tarefa concluída.');expect(calls).toBe(1);expect(commands).toHaveLength(1);await expect(card.getByRole('button')).toHaveCount(0);
  expect((await new AxeBuilder({page}).include('.gika-panel').analyze()).violations).toEqual([]);await page.screenshot({path:`/tmp/leve-m4-complete-${mobile?'mobile-dark':'desktop-light'}.png`});
  await page.getByRole('button',{name:'Fechar Gika'}).click();await page.goto(`/hoje?dia=${dueDate}`);await page.reload();await expect(page.locator('.day-activity.is-completed').filter({hasText:title})).toHaveCount(1);
});
test('M4-T1 lost real ack retry retains exact identity and no extra state transition',async({page})=>{
  await enter(page);const title='Academia M4 retry',id=await create(page,title),ops:string[]=[],results:string[]=[];let model=0;
  await page.route('**/api/gika/respond',route=>{model++;return route.fulfill({json:descriptor(id,title)});});
  await page.route('**/api/commands',async route=>{const c=route.request().postDataJSON();ops.push(c.operationId);const response=await route.fetch();expect(response.status()).toBe(200);const ack=await response.json();results.push(ack.result);expect(ack.revision).toBe(2);if(ops.length===1)await route.abort('failed');else await route.fulfill({response});});
  await ask(page,title);await expect(page.getByRole('button',{name:'Tentar novamente',exact:true})).toBeVisible();await expect(page.getByRole('group',{name:'Tarefa concluída',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(page.getByRole('group',{name:'Tarefa concluída',exact:true})).toContainText(title);
  expect(ops).toHaveLength(2);expect(ops[0]).toBe(ops[1]);expect(results).toEqual(['applied','alreadyApplied']);expect(model).toBe(1);
});
test('M4-T1 ambiguity, missing and already completed are observations with no commands',async({page})=>{
  await enter(page);let writes=0;page.on('request',r=>{if(r.url().endsWith('/api/commands'))writes++;});
  let status='ambiguous';await page.route('**/api/gika/respond',route=>route.fulfill({json:{text:status==='already_completed'?'Academia já estava concluída.':status==='ambiguous'?'Encontrei duas tarefas chamadas Academia. Qual você concluiu?':'Não encontrei essa tarefa nesse dia.',simulated:false,reads:[],completionResolution:{status,candidates:status==='not_found'?[]:[{id:'one',title:'Academia',dueDate,status:'completed'}]}}}));
  const q=await ask(page,'Academia');await expect(page.locator('.gika-message.is-assistant')).toHaveCount(1);
  for(status of ['not_found','already_completed']){await q.fill('Terminei Academia');await q.press('Enter');await expect(page.locator('.gika-message.is-assistant')).toHaveCount(status==='not_found'?2:3);}
  expect(writes).toBe(0);await expect(page.getByRole('group',{name:'Tarefa concluída',exact:true})).toHaveCount(0);
});
test('M4-T1 conventional edit after resolution produces conflict without overwriting or automatic retry',async({page})=>{
  await enter(page);const title='Academia M4 conflito',id=await create(page,title);
  await page.route('**/api/gika/respond',async route=>{
    await page.evaluate(async({id,title,dueDate})=>{const path='/src/platform/api.ts';const {sendCommand}=await import(/* @vite-ignore */ path);await sendCommand({command:'activity.update',operationId:crypto.randomUUID(),entityId:id,expectedRevision:1,payload:{title:`${title} alterada`,descriptionPlain:'',categoryId:null,colorHex:null,estimatedMinutes:null,reminderSpecs:[],schedule:{type:'task',dueDate,dueTime:null,timeZone:'America/Sao_Paulo',disambiguation:'reject'}}});},{id,title,dueDate});
    await route.fulfill({json:descriptor(id,title)});
  });
  await ask(page,title);await expect(page.locator('.gika-feedback')).toContainText('Essa tarefa foi alterada. Confira sua agenda e envie um novo pedido.');await expect(page.getByRole('button',{name:'Tentar novamente',exact:true})).toHaveCount(0);await expect(page.getByRole('group',{name:'Tarefa concluída',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Fechar Gika'}).click();await page.goto(`/hoje?dia=${dueDate}`);const row=page.locator('.day-activity').filter({hasText:`${title} alterada`});await expect(row).toHaveCount(1);await expect(row).not.toHaveClass(/is-completed/);
});
test('M4-T1 logout while resolution waits prevents completion dispatch',async({page})=>{
  await enter(page);const title='Academia M4 logout',id=await create(page,title);let writes=0,finish:(()=>Promise<void>)|undefined;
  page.on('request',r=>{if(r.url().endsWith('/api/commands')&&r.postDataJSON()?.command==='activity.setStatus')writes++;});
  await page.route('**/api/gika/respond',route=>{finish=()=>route.fulfill({json:descriptor(id,title)}).catch(()=>undefined);});
  await ask(page,title);await expect.poll(()=>Boolean(finish)).toBe(true);await page.getByRole('button',{name:'Fechar Gika'}).click();await page.getByRole('button',{name:'Sair',exact:true}).click();await finish!();await enter(page);
  await page.getByRole('button',{name:'Pergunte à Gika'}).click();await expect(page.locator('.gika-message')).toHaveCount(0);expect(writes).toBe(0);
});
