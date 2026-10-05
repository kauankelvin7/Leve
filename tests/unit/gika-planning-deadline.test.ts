import { afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createGeminiAdapter } from '../../server/gika/gemini';
import { createGikaRouter } from '../../server/gika/router';
import { AppError } from '../../server/errors';
vi.mock('../../server/platform/firebase.ts', () => ({ db: {}, adminAuth: {} }));
afterEach(() => vi.useRealTimers());

it('two provider phases below their individual deadline fit the bounded organization operation', async () => {
  vi.useFakeTimers();
  const context = { today: '2026-10-05', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
  let calls = 0;
  const model = createGeminiAdapter(async payload => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 8_000));
    const planning = payload.tools[0]!.functionDeclarations[0]!.name === 'propose_organization';
    const functionCall = planning ? { name: 'propose_organization', args: { items: [{ ref: 0, action: 'keep', dueDate: context.today, dueTime: '10:00' }] } }
      : { name: 'respond_turn', args: { domainIntent: 'AGENDA_ACTION', certain: true, explicitAction: true, reply: null, proposals: [{ name: 'request_organization', args: { period: 'day' } }] } };
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall }] } }] });
  });
  const repository = { authorize: vi.fn().mockResolvedValue(context), recoverMutation: vi.fn().mockResolvedValue(null),
    read: vi.fn().mockImplementation(async (_uid, range) => ({ ...range, partial: false, cached: false,
      items: [{ id: 'task', title: 'Caminhar', revision: 1, kind: 'task', status: 'pending', seriesId: null, occurrenceKey: null,
        schedule: { type: 'task', dueDate: context.today, dueTime: '10:00', timeZone: context.timeZone, disambiguation: 'reject' } }] })) };
  const quota = vi.fn();
  const app = express();
  app.use((_req, res, next) => { res.locals.identity = { uid: 'synthetic-user' }; next(); });
  app.use('/gika', createGikaRouter(model, repository, quota));
  app.use((error: AppError, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status).json({ code: error.code }));
  const result = request(app).post('/gika/respond').send({ requestId: crypto.randomUUID(), text: 'Dá uma organizada no meu dia' }).then(response => response);
  await vi.waitFor(() => expect(calls).toBe(1));
  await vi.advanceTimersByTimeAsync(8_000);
  await vi.waitFor(() => expect(calls).toBe(2));
  await vi.advanceTimersByTimeAsync(8_000);
  const response = await result;
  expect(response.status).toBe(200);
  expect(response.body.organizationPreview).toBeDefined();
  expect(response.body).not.toHaveProperty('batchConfirmation');
  expect(quota).toHaveBeenCalledTimes(2);
});
