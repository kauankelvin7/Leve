import express, { Router, type ErrorRequestHandler } from 'express';
import { gikaRequestSchema, gikaResponseSchema, readResultSchema } from '../../packages/domain/src/gika.ts';
import { AppError } from '../errors.ts';
import { createGeminiAdapter } from './gemini.ts';
import { bounded, GikaFault, type ModelAdapter } from './model.ts';
import { createReadLimiter, readRange, validateCalls } from './policy.ts';
import { firestoreReads, type ReadRepository } from './reads.ts';
const fallback = 'Não consegui falar com a Gika agora. Sua agenda continua disponível.';
export function createGikaRouter(model: ModelAdapter = createGeminiAdapter(), repository: ReadRepository = firestoreReads) {
  const router = Router(); const acquire = createReadLimiter();
  router.use(express.json({ limit: '12kb', strict: true }));
  const bodyError: ErrorRequestHandler = (error, _request, _response, next) => {
    if (error?.type === 'entity.too.large') { next(new AppError(413, 'PAYLOAD_TOO_LARGE', 'Conteúdo acima do limite permitido.')); return; }
    if (error?.type === 'entity.parse.failed') { next(new AppError(400, 'VALIDATION_ERROR', 'Confira a pergunta e tente novamente.')); return; }
    next(error);
  };
  router.use(bodyError);
  router.post('/respond', async (request, response) => {
    const input = gikaRequestSchema.parse(request.body);
    const controller = new AbortController();
    const close = () => { if (!response.writableEnded) controller.abort(); };
    response.once('close', close);
    let release: (() => void) | undefined;
    try {
      const result = await bounded(async signal => {
        const identity = response.locals.identity;
        const context = await repository.authorize(identity);
        if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
        release = acquire(identity.uid);
        const calls = validateCalls(await model.interpret({ text: input.text, context }, signal));
        // Recheck account/policy after the upstream wait, before exposing data.
        const current = calls.length ? await repository.authorize(identity) : context;
        if (current.today !== context.today || current.timeZone !== context.timeZone || current.weekStartsOn !== context.weekStartsOn) throw new GikaFault('GIKA_POLICY');
        // Validate policy for ALL calls before ANY agenda reads.
        const ranges = calls.map(call => readRange(call, current));
        const reads = [];
        for (const range of ranges) {
          if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.startDate !== range.startDate || read.endDate !== range.endDate || read.timeZone !== range.timeZone) throw new GikaFault('GIKA_INVALID_RESPONSE');
          reads.push(read);
        }
        const text = reads.length === 0
          ? 'Por enquanto, posso consultar hoje, um dia ou uma semana. Qual você quer ver?'
          : reads.some(read => read.partial) ? 'Esta consulta mostra parte da sua agenda. Confira o calendário para ver mais.'
          : 'Veja sua agenda para o período consultado.';
        return gikaResponseSchema.parse({ text, simulated: false, reads });
      }, controller.signal, 15_000);
      if (!controller.signal.aborted) response.json(result);
    } catch (error) {
      if (error instanceof AppError) throw error;
      const code = error instanceof GikaFault ? error.code : 'GIKA_UNAVAILABLE';
      const status = code === 'GIKA_QUOTA' ? 429 : code === 'GIKA_TIMEOUT' ? 504 : code === 'GIKA_POLICY' || code === 'GIKA_MALFORMED_CALL' ? 422 : 503;
      throw new AppError(status, code, code === 'GIKA_QUOTA' ? 'O limite de consultas foi atingido por agora. Sua agenda continua disponível.' : fallback);
    } finally { release?.(); response.removeListener('close', close); }
  });
  return router;
}
