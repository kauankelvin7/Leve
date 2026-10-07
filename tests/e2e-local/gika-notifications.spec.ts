import { expect, test, type Page } from '@playwright/test';
import express from 'express';
import request from 'supertest';
import { Temporal } from '@js-temporal/polyfill';

// Only Gemini's upstream response is controlled; semantic adapter, router,
// Auth/Firestore, command dispatch and notification jobs are the real modules.
async function controlledInterpretation(page: Page) {
  process.env.FIREBASE_PROJECT_ID ??= 'demo-leve';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9099';
  process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
  expect(process.env.FIREBASE_PROJECT_ID).toBe('demo-leve');
  expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toMatch(/^(?:localhost|127\.0\.0\.1):9099$/);
  expect(process.env.FIRESTORE_EMULATOR_HOST).toMatch(/^(?:localhost|127\.0\.0\.1):8080$/);
  const { createGeminiAdapter } = await import('../../server/gika/gemini');
  const { createGikaRouter } = await import('../../server/gika/router');
  const { firestoreReads } = await import('../../server/gika/reads');
  const { auth, db } = await import('../../server/platform/firebase');
  // Isolate synthetic accounts instead of bypassing the real per-user quota.
  const email = `gika-notification-${crypto.randomUUID()}@example.test`;
  await auth.createUser({ email, password: 'leve-local-123', emailVerified: true, displayName: 'Conta de teste Gika' });
  const dueDate = Temporal.Now.instant().toZonedDateTimeISO('America/Sao_Paulo').toPlainDate().add({ days: 1 }).toString();
  let proposedText = '';
  const adapter = createGeminiAdapter(async () => {
    const args = proposedText === 'Preciso agendar algo'
      ? { domainIntent: 'AGENDA_ACTION', certain: true, explicitAction: true, reply: 'O que você gostaria de agendar?', proposals: [] }
      : { domainIntent: 'AGENDA_ACTION', certain: true, explicitAction: true, reply: null, proposals: [{ name: 'create_task', args: { title: proposedText.startsWith('Ir a feira') ? 'Ir a feira' : 'ir pra feira', dueDate, dueTime: proposedText.includes('sem horário') ? null : '19:00' } }] };
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'respond_turn', args } }] } }] });
  });
  const app = express();
  app.use(async (incoming, response, next) => {
    const token = incoming.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) { response.sendStatus(401); return; }
    response.locals.identity = await auth.verifyIdToken(token, true);
    response.locals.correlationId = crypto.randomUUID();
    next();
  });
  app.use('/api/gika', createGikaRouter(adapter, firestoreReads));
  await page.route('**/api/gika/respond', async route => {
    proposedText = route.request().postDataJSON().text;
    const interpreted = await request(app).post('/api/gika/respond')
      .set('Authorization', route.request().headers().authorization!)
      .send(route.request().postDataJSON());
    await route.fulfill({ status: interpreted.status, json: interpreted.body });
  });
  return { dueDate, db, email };
}

async function enter(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) await skip.click();
}

test('Gika cria tarefa sem hora e informa o aviso no dia sem expor configuração', async ({ page }) => {
  const { dueDate, db, email } = await controlledInterpretation(page);
  await enter(page, email);
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'activity.create');
  await question.fill('Agende ir pra feira amanhã sem horário e me notifique');
  await question.press('Enter');
  const result = page.getByRole('group', { name: 'Tarefa adicionada', exact: true }).last();
  await expect(result).toContainText('Aviso automático no dia da atividade');
  const applied = await ack;
  expect(applied.status()).toBe(200);
  const jobs = await db.collection('reminderJobs').where('activityId', '==', applied.request().postDataJSON().entityId).get();
  expect(jobs.size).toBe(1);
  expect(jobs.docs.some(job => job.data().scheduledAt === `${dueDate}T03:00:00.000Z`)).toBe(true);
});

for (const continuation of [false, true]) test(`real semantic pipeline: ${continuation ? 'complete clarification reply' : 'mixed scheduling and notification'}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { dueDate, db, email } = await controlledInterpretation(page);
  await enter(page, email);
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  if (continuation) {
    await question.fill('Preciso agendar algo');
    await question.press('Enter');
    await expect(page.locator('.gika-message.is-assistant').last()).toContainText('O que você gostaria de agendar?');
  }
  const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'activity.create');
  await question.fill(continuation ? 'Ir a feira amanhã às 19:00' : 'Poderia agendar para amanhã às 19:00 que eu tenho que ir pra feira, preciso que me notifique');
  await question.press('Enter');
  const applied = await ack;
  expect(applied.status()).toBe(200);
  expect(await applied.json()).toMatchObject({ result: 'applied' });
  const result = page.getByRole('group', { name: 'Tarefa adicionada', exact: true }).last();
  await expect(result).toContainText(/ir (?:pra|a) feira/i);
  await expect(result).toContainText('Aviso automático às 19:00');
  const entityId = applied.request().postDataJSON().entityId;
  const jobs = await db.collection('reminderJobs').where('activityId', '==', entityId).get();
  expect(jobs.size).toBe(1);
  expect(jobs.docs[0]!.data()).toMatchObject({ reminderSpecId: 'at-time', state: 'pending' });
  await expect(page.getByText('Resposta indisponível', { exact: true })).toHaveCount(0);
  await question.fill('Agende ir pra feira amanhã às 19h e me notifique o dia todo');
  await question.press('Enter');
  await expect(page.locator('.gika-message.is-assistant').last()).toContainText('não contínuo');
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toHaveCount(1);
  await expect(page.getByText('Resposta indisponível', { exact: true })).toHaveCount(0);
  if (!continuation) {
    await result.getByRole('button', { name: 'Desfazer', exact: true }).click();
    await expect(result).toContainText('Criação desfeita.');
    await expect(result).not.toContainText('Aviso automático');
  }
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.goto(`/hoje?dia=${dueDate}`);
  await expect(page.locator('.day-activity').filter({ hasText: continuation ? 'Ir a feira' : 'ir pra feira' })).toHaveCount(continuation ? 1 : 0);
});
