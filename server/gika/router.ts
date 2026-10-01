import { assessCreation, assessMissingIntent, assessResolution, assessReplay } from './policyAssessment.ts';
import { validateReschedule,resolveReschedule,isRescheduleRequest } from './reschedulePolicy.ts';
import { validateUpdate, resolveUpdate, resolveUpdateIntent, isUpdateRequest } from './updatePolicy.ts';
import { validateCompletion, resolveCompletion, resolveCompletionIntent } from './completePolicy.ts';
import express, { Router, type ErrorRequestHandler } from 'express';
import { gikaRequestSchema, gikaInterpretationSchema, readResultSchema } from '../../packages/domain/src/gika.ts';
import { AppError } from '../errors.ts';
import { createGeminiAdapter } from './gemini.ts';
import { bounded, GikaFault, type ModelAdapter } from './model.ts';
import { createReadLimiter, readRange } from './policy.ts';
import { resolveCreationIntent, validateCreation, validateToolCalls } from './createPolicy.ts';
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
        await repository.authorize(identity, 'receipt');
        if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
        const recovered = await repository.recoverMutation(identity.uid, input);
        if (recovered) {
          // Historical snapshot only; the bridge still needs a freshly authorized command ack.
          await repository.authorize(identity, 'receipt');
          const decision = assessReplay(recovered.kind, 'verified');
          if (decision.kind !== (recovered.kind === 'reschedule' ? 'confirm' : 'allow')) throw new GikaFault('GIKA_POLICY');
          return gikaInterpretationSchema.parse({ text: recovered.kind === 'create' ? 'Preparando a tarefa…' : recovered.kind === 'complete' ? 'Preparando a conclusão…' : 'Preparando a alteração…', simulated: false, reads: [],
            ...(recovered.kind === 'create' ? { createTask: recovered.task } : recovered.kind === 'complete' ? { completeTask: recovered.task } : recovered.kind === 'reschedule' ? { rescheduleTask: recovered.task } : { updateTask: recovered.task }) });
        }
        const context = await repository.authorize(identity);
        release = acquire(identity.uid);
        const calls = validateToolCalls(await model.interpret({ text: input.text, context }, signal));
        // Recheck account/policy after the upstream wait, before exposing data.
        const current = calls.length ? await repository.authorize(identity) : context;
        if (current.today !== context.today || current.timeZone !== context.timeZone || current.weekStartsOn !== context.weekStartsOn) throw new GikaFault('GIKA_POLICY');
        if (calls[0]?.name === 'reschedule_task') {
          const intent = validateReschedule(calls[0].args, input.text, current);
          if ('clarification' in intent) { assessMissingIntent('reschedule_task', 'verified'); return gikaInterpretationSchema.parse({ text: intent.clarification, simulated: false, reads: [], rescheduleResolution: { status: 'clarify', candidates: [] } }); }
          const range = { startDate: intent.date, endDate: intent.date, timeZone: current.timeZone };
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.timeZone !== current.timeZone || signal.aborted) throw new GikaFault('GIKA_POLICY');
          const afterRead = await repository.authorize(identity);
          if (afterRead.today !== current.today || afterRead.timeZone !== current.timeZone || afterRead.weekStartsOn !== current.weekStartsOn) throw new GikaFault('GIKA_POLICY');
          const resolved = resolveReschedule(intent, read);
          const decision = assessResolution('reschedule_task', intent, read, resolved, 'verified');
          // A same-operation commit may have raced the read. Receipt precedes fresh resolution.
          const receipt = await repository.recoverMutation(identity.uid, input);
          if (receipt && receipt.kind !== 'reschedule') throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outra ação. Envie um novo pedido.');
          const committed = receipt?.task;
          await repository.authorize(identity, 'receipt');
          if (receipt) { const replayDecision = assessReplay(receipt.kind, 'verified'); if (replayDecision.kind !== 'confirm') throw new GikaFault('GIKA_POLICY'); }
          if (!receipt && resolved.task && decision.kind !== 'confirm') throw new GikaFault('GIKA_POLICY');
          if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
          return gikaInterpretationSchema.parse({ text: committed ? 'Confira a nova data antes de mover a tarefa.' : resolved.text, simulated: false, reads: [],
            ...(committed || resolved.task ? { rescheduleTask: committed ?? resolved.task } : { rescheduleResolution: resolved.resolution }) });
        }
        if (calls[0]?.name === 'update_task') {
          const intent = validateUpdate(calls[0].args, input.text, current);
          if ('clarification' in intent) { assessMissingIntent('update_task', 'verified'); return gikaInterpretationSchema.parse({ text: intent.clarification, simulated: false, reads: [], updateResolution: { status: 'clarify', candidates: [] } }); }
          const range = { startDate: intent.date, endDate: intent.date, timeZone: current.timeZone };
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.timeZone !== current.timeZone || signal.aborted) throw new GikaFault('GIKA_POLICY');
          const afterRead = await repository.authorize(identity);
          if (afterRead.today !== current.today || afterRead.timeZone !== current.timeZone || afterRead.weekStartsOn !== current.weekStartsOn) throw new GikaFault('GIKA_POLICY');
          const resolved = resolveUpdate(intent, read);
          const decision = assessResolution('update_task', intent, read, resolved, 'verified');
          // A same-operation commit may have raced the read. Receipt precedes fresh resolution.
          const receipt = await repository.recoverMutation(identity.uid, input);
          if (receipt && receipt.kind !== 'update') throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outra ação. Envie um novo pedido.');
          const committed = receipt?.task;
          await repository.authorize(identity, 'receipt');
          if (receipt) { const replayDecision = assessReplay(receipt.kind, 'verified'); if (replayDecision.kind !== 'allow') throw new GikaFault('GIKA_POLICY'); }
          if (!receipt && resolved.task && decision.kind !== 'allow') throw new GikaFault('GIKA_POLICY');
          if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
          return gikaInterpretationSchema.parse({ text: committed ? 'Preparando a alteração…' : resolved.text, simulated: false, reads: [],
            ...(committed || resolved.task ? { updateTask: committed ?? resolved.task } : { updateResolution: resolved.resolution }) });
        }
        if (calls[0]?.name === 'complete_task') {
          const intent = validateCompletion(calls[0].args, input.text, current);
          if ('clarification' in intent) { assessMissingIntent('complete_task', 'verified'); return gikaInterpretationSchema.parse({ text: intent.clarification, simulated: false, reads: [], completionResolution: { status: 'clarify', candidates: [] } }); }
          const range = { startDate: intent.date, endDate: intent.date, timeZone: current.timeZone };
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.timeZone !== current.timeZone || signal.aborted) throw new GikaFault('GIKA_POLICY');
          const afterRead = await repository.authorize(identity);
          if (afterRead.today !== current.today || afterRead.timeZone !== current.timeZone || afterRead.weekStartsOn !== current.weekStartsOn) throw new GikaFault('GIKA_POLICY');
          const resolved = resolveCompletion(intent, read);
          const decision = assessResolution('complete_task', intent, read, resolved, 'verified');
          // A same-operation commit may have raced the read. Receipt precedes fresh resolution.
          const receipt = await repository.recoverMutation(identity.uid, input);
          if (receipt && receipt.kind !== 'complete') throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outra ação. Envie um novo pedido.');
          const committed = receipt?.task;
          await repository.authorize(identity, 'receipt');
          if (receipt) { const replayDecision = assessReplay(receipt.kind, 'verified'); if (replayDecision.kind !== 'allow') throw new GikaFault('GIKA_POLICY'); }
          if (!receipt && resolved.task && decision.kind !== 'allow') throw new GikaFault('GIKA_POLICY');
          if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
          return gikaInterpretationSchema.parse({ text: committed ? 'Preparando a conclusão…' : resolved.text, simulated: false, reads: [],
            ...(committed || resolved.task ? { completeTask: committed ?? resolved.task } : { completionResolution: resolved.resolution }) });
        }
        if (calls[0]?.name === 'create_task') {
          const intent = validateCreation(calls[0].args, input.text, current);
          const decision = assessCreation(Boolean(intent.task), 'verified');
          if (intent.task && decision.kind !== 'allow') throw new GikaFault('GIKA_POLICY');
          return gikaInterpretationSchema.parse({ text: intent.task ? 'Preparando a tarefa…' : intent.clarification, simulated: false, reads: [], ...(intent.task ? { createTask: intent.task } : {}) });
        }
        // Validate policy for ALL calls before ANY agenda reads.
        const ranges = calls.map(call => { if (call.name === 'create_task' || call.name === 'complete_task' || call.name === 'update_task' || call.name === 'reschedule_task') throw new GikaFault('GIKA_POLICY'); return readRange(call, current); });
        const reads = [];
        for (const range of ranges) {
          if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.startDate !== range.startDate || read.endDate !== range.endDate || read.timeZone !== range.timeZone) throw new GikaFault('GIKA_INVALID_RESPONSE');
          reads.push(read);
        }
        const text = reads.length === 0
          ? (isRescheduleRequest(input.text) ? 'Não movi nenhuma tarefa. Informe o título, o dia atual e a nova data.' : isUpdateRequest(input.text) ? ('clarification' in resolveUpdateIntent(input.text, current) ? 'Qual tarefa você quer renomear e qual será o novo título?' : 'Não alterei nenhuma tarefa. Reformule o pedido ou use sua agenda.') : /^(?:terminei|conclu|marca|complete|marque)/i.test(input.text) ? ('clarification' in resolveCompletionIntent(input.text, current) ? 'Qual tarefa você quer concluir? Informe o título e o dia.' : 'Não concluí nenhuma tarefa. Reformule o pedido ou use sua agenda.') : resolveCreationIntent(input.text, current).clarification ?? 'Não adicionei nenhuma tarefa. Você pode reformular o pedido ou consultar sua agenda.')
          : reads.some(read => read.partial) ? 'Esta consulta mostra parte da sua agenda. Confira o calendário para ver mais.'
          : 'Veja sua agenda para o período consultado.';
        return gikaInterpretationSchema.parse({ text, simulated: false, reads });
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
