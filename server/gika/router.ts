import { organizationCallSchema } from '../../packages/domain/src/gikaOrganization.ts';
import { Temporal } from '@js-temporal/polyfill';
import { organizationBatch, organizationCandidates, organizationScope, organizationPeriod, planningContext, validateOrganization } from './organizationPolicy.ts';
import { validateBatch, resolveBatch } from './batchPolicy.ts';
import { issueBatchConfirmation } from './confirmation.ts';
import { z } from 'zod';
import { verifyRecurrenceChoice, issueRecurrenceConfirmation } from './confirmation.ts';
import { scopedIntent } from './scopeIntent.ts';
import { prepareRecurrence, recurrenceEffect } from './recurrencePolicy.ts';
import { hashCanonicalValue } from '../hash.ts';
import { issueConfirmation } from './confirmation.ts';
import { assessCreation, assessMissingIntent, assessResolution, assessReplay } from './policyAssessment.ts';
import { validateReschedule,resolveReschedule,isRescheduleRequest } from './reschedulePolicy.ts';
import { validateUpdate, resolveUpdate, resolveUpdateIntent, isUpdateRequest } from './updatePolicy.ts';
import { validateCompletion, resolveCompletion, resolveCompletionIntent } from './completePolicy.ts';
import express, { Router, type ErrorRequestHandler } from 'express';
import { gikaRequestSchema, gikaInterpretationSchema, readResultSchema } from '../../packages/domain/src/gika.ts';
import { AppError } from '../errors.ts';
import { createGeminiAdapter } from './gemini.ts';
import { bounded, GikaFault, type ModelAdapter } from './model.ts';
import { readRange } from './policy.ts';
import { resolveCreationIntent, validateCreation, validateToolCalls } from './createPolicy.ts';
import { firestoreReads, type ReadRepository } from './reads.ts';
import { consumeGikaQuota } from './quota.ts';
const fallback = 'Não consegui falar com a Gika agora. Sua agenda continua disponível.';
export function createGikaRouter(model: ModelAdapter = createGeminiAdapter(), repository: ReadRepository = firestoreReads, consumeQuota: typeof consumeGikaQuota = consumeGikaQuota) {
  const router = Router();
  router.use(express.json({ limit: '12kb', strict: true }));
  const bodyError: ErrorRequestHandler = (error, _request, _response, next) => {
    if (error?.type === 'entity.too.large') { next(new AppError(413, 'PAYLOAD_TOO_LARGE', 'Conteúdo acima do limite permitido.')); return; }
    if (error?.type === 'entity.parse.failed') { next(new AppError(400, 'VALIDATION_ERROR', 'Confira a pergunta e tente novamente.')); return; }
    next(error);
  };
  router.use(bodyError);
  // Receipt-only recovery: this route cannot interpret, resolve a new target or call the provider.
  router.post('/recover-confirmation', async (request, response) => {
    const input = gikaRequestSchema.parse(request.body), identity = response.locals.identity;
    await repository.authorize(identity, 'receipt');
    const recovered = await repository.recoverMutation(identity.uid, input);
    await repository.authorize(identity, 'receipt');
    if (recovered?.kind === 'recurrence') { response.json({ recurrenceConfirmation: recovered.confirmation }); return; }
    if (recovered?.kind !== 'reschedule' || !recovered.confirmation) throw new AppError(409, 'OPERATION_MISMATCH', 'Não encontrei a confirmação deste pedido. Faça o pedido novamente.');
    response.json(recovered.confirmation);
  });
  router.post('/recover-batch', async(request,response)=>{
    const input=gikaRequestSchema.parse(request.body),identity=response.locals.identity;
    await repository.authorize(identity,'receipt');
    const recovered=await repository.recoverBatch?.(identity.uid,input);
    await repository.authorize(identity,'receipt');
    if(!recovered)throw new AppError(409,'OPERATION_MISMATCH','Não encontrei alterações deste pedido. Faça o pedido novamente.');
    response.json(recovered);
  });
  const selectionSchema = gikaRequestSchema.safeExtend({ token: z.string().regex(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/).max(8192), scope: z.enum(['occurrence', 'future']) }).strict();
  router.post('/choose-recurrence', async (request, response) => {
    const input = selectionSchema.parse(request.body), identity = response.locals.identity;
    await repository.authorize(identity, 'receipt');
    const committed = await repository.recoverMutation(identity.uid, { requestId: input.requestId, text: input.text });
    if (committed) {
      await repository.authorize(identity, 'receipt');
      if (committed.kind !== 'recurrence' || committed.confirmation.effect.scope !== input.scope) throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outra ação. Envie um novo pedido.');
      response.json({ confirmation: committed.confirmation }); return;
    }
    await repository.authorize(identity);
    const choice = verifyRecurrenceChoice(identity.uid, input, input.token);
    if (!choice.options.includes(input.scope) || !repository.inspectRecurrence) throw new AppError(422, 'GIKA_POLICY', 'Esse escopo não está disponível. Use sua agenda.');
    const actual = await repository.inspectRecurrence(identity.uid, choice.proposal.task);
    const expected = choice.proposal.recurrence;
    if (!actual || actual.seriesHash !== expected.seriesHash || actual.targetHash !== expected.targetHash || (input.scope === 'future' && hashCanonicalValue(actual) !== hashCanonicalValue(expected))) throw new AppError(409, 'REVISION_CONFLICT', 'Essa rotina mudou. Faça o pedido novamente.');
    await repository.authorize(identity);
    const effect = recurrenceEffect(identity.uid, input, choice.proposal, input.scope);
    response.json({ confirmation: issueRecurrenceConfirmation(identity.uid, input, effect, input.token) });
  });
  router.post('/respond' , async (request, response) => {
    const input = gikaRequestSchema.parse(request.body);
    const controller = new AbortController();
    const close = () => { if (!response.writableEnded) controller.abort(); };
    response.once('close', close);
    try {
      const result = await bounded(async signal => {
        const identity = response.locals.identity;
        await repository.authorize(identity, 'receipt');
        if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
        const recoveredBatch = await repository.recoverBatch?.(identity.uid,input);
        if(recoveredBatch){await repository.authorize(identity,'receipt');return gikaInterpretationSchema.parse({text:'Confira as alterações deste pedido.',simulated:false,reads:[],batchConfirmation:recoveredBatch.confirmation});}
        const recovered = await repository.recoverMutation(identity.uid, input);
        if (recovered) {
          if (recovered.kind === 'recurrence') {
            await repository.authorize(identity, 'receipt');
            return gikaInterpretationSchema.parse({ text: 'Confira o escopo antes de alterar a rotina.', simulated: false, reads: [], recurrenceConfirmation: recovered.confirmation });
          }
          // Historical snapshot only; the bridge still needs a freshly authorized command ack.
          await repository.authorize(identity, 'receipt');
          const decision = assessReplay(recovered.kind, 'verified');
          if (decision.kind !== (recovered.kind === 'reschedule' ? 'confirm' : 'allow')) throw new GikaFault('GIKA_POLICY');
          return gikaInterpretationSchema.parse({ text: recovered.kind === 'create' ? 'Preparando a tarefa…' : recovered.kind === 'complete' ? 'Preparando a conclusão…' : 'Preparando a alteração…', simulated: false, reads: [],
            ...(recovered.kind === 'create' ? { createTask: recovered.task } : recovered.kind === 'complete' ? { completeTask: recovered.task } : recovered.kind === 'reschedule' ? { rescheduleTask: recovered.task, ...(recovered.confirmation ? { confirmation: recovered.confirmation } : {}) } : { updateTask: recovered.task }) });
        }
        const context = await repository.authorize(identity);
        const period = organizationPeriod(input.text);
        if (period) {
          const range = period==='week' ? readRange({name:'get_week',args:{date:context.today}},context) : {startDate:context.today,endDate:Temporal.PlainDate.from(context.today).add({days:6}).toString(),timeZone:context.timeZone};
          // Daily reads today; weekly reads the existing civil week. No history expansion.
          const source = period==='week' ? range : {...range,startDate:context.today,endDate:context.today};
          const read = readResultSchema.parse(await repository.read(identity.uid,source));
          const beforeProvider=await repository.authorize(identity);
          if(JSON.stringify(beforeProvider)!==JSON.stringify(context)||signal.aborted)throw new GikaFault('GIKA_POLICY');
          if(read.timeZone!==context.timeZone || read.startDate!==source.startDate || read.endDate!==source.endDate)throw new GikaFault('GIKA_POLICY');
          if(read.partial || read.items.length>=50)return gikaInterpretationSchema.parse({text:'Esta consulta está incompleta. Não posso propor uma organização completa.',simulated:false,reads:[],organizationResolution:{status:'partial'}});
          if(organizationCandidates(read,context.today).length>5)return gikaInterpretationSchema.parse({text:'Posso organizar até 5 tarefas por vez. Escolha um dia com um conjunto menor.',simulated:false,reads:[],organizationResolution:{status:'limit'}});
          const scope=organizationScope(input.text);
          if(scope==='future'||scope==='all')return gikaInterpretationSchema.parse({text:'Não posso organizar próximas ocorrências ou séries em grupo. Use sua agenda para esse escopo.',simulated:false,reads:[],organizationResolution:{status:'unsupported_scope'}});
          const planning = planningContext(read,context);
          if(!planning?.tasks.length)return gikaInterpretationSchema.parse({text:'Não encontrei tarefas pendentes para organizar nesse período.',simulated:false,reads:[],organizationResolution:{status:'empty'}});
          await consumeQuota(identity.uid);
          const calls = validateToolCalls(await model.interpret({text:input.text,context,planning:{...planning,endDate:range.endDate}},signal,{correlationId:response.locals.correlationId}));
          if(calls.length!==1)throw new GikaFault('GIKA_POLICY');
          const after = await repository.authorize(identity);
          if(JSON.stringify(after)!==JSON.stringify(context))throw new GikaFault('GIKA_POLICY');
          const fresh = readResultSchema.parse(await repository.read(identity.uid,source));
          await repository.authorize(identity);
          if(fresh.startDate!==source.startDate || fresh.endDate!==source.endDate)throw new GikaFault('GIKA_POLICY');
          if(hashCanonicalValue({...read,items:[...read.items].sort((a,b)=>a.id.localeCompare(b.id))})!==hashCanonicalValue({...fresh,items:[...fresh.items].sort((a,b)=>a.id.localeCompare(b.id))}))return gikaInterpretationSchema.parse({text:'Sua agenda mudou durante a sugestão. Faça o pedido novamente.',simulated:false,reads:[],organizationResolution:{status:'stale'}});
          const proposed=organizationCallSchema.safeParse(calls[0]);
          if(!proposed.success)throw new GikaFault('GIKA_MALFORMED_CALL');
          if(proposed.data.args.items.some(item=>item.action==='move' && planning.tasks[item.ref]?.recurring) && scope!=='occurrence')return gikaInterpretationSchema.parse({text:'Há tarefas que se repetem. Quer organizar só estas ocorrências? Faça o pedido indicando esse escopo.',simulated:false,reads:[],organizationResolution:{status:'scope_required'}});
          const preview = validateOrganization(calls[0],{...read,endDate:range.endDate},{...fresh,endDate:range.endDate},context,period,input.text);
          if(signal.aborted)throw new GikaFault('GIKA_TIMEOUT');
          const plan = await organizationBatch(preview,repository,identity.uid,input);
          await repository.authorize(identity);
          if(signal.aborted)throw new GikaFault('GIKA_TIMEOUT');
          return gikaInterpretationSchema.parse({text:plan?`Sugestão para ${period==='week'?'sua semana':'o seu dia'}. Confira as mudanças antes de confirmar.`:'Sugiro manter essas tarefas como estão. Nenhuma tarefa foi alterada.',simulated:false,reads:[],...(plan?{batchConfirmation:issueBatchConfirmation(identity.uid,input,plan)}:{organizationPreview:preview})});
        }
        await consumeQuota(identity.uid);
        const calls = validateToolCalls(await model.interpret({ text: input.text, context }, signal, { correlationId: response.locals.correlationId }));
        // Recheck account/policy after the upstream wait, before exposing data.
        const current = calls.length ? await repository.authorize(identity) : context;
        if (current.today !== context.today || current.timeZone !== context.timeZone || current.weekStartsOn !== context.weekStartsOn) throw new GikaFault('GIKA_POLICY');
        if(calls[0]?.name==='batch_complete'||calls[0]?.name==='batch_reschedule'){
          const intent=validateBatch(calls[0].args,input.text,current,calls[0].name==='batch_complete'?'complete':'reschedule');
          if('clarification' in intent)return gikaInterpretationSchema.parse({text:intent.clarification,simulated:false,reads:[]});
          const range={startDate:intent.date,endDate:intent.date,timeZone:current.timeZone};
          const read=readResultSchema.parse(await repository.read(identity.uid,range));
          if(read.timeZone!==current.timeZone||signal.aborted)throw new GikaFault('GIKA_POLICY');
          const afterRead=await repository.authorize(identity);
          if(afterRead.today!==current.today||afterRead.timeZone!==current.timeZone||afterRead.weekStartsOn!==current.weekStartsOn)throw new GikaFault('GIKA_POLICY');
          const resolved=await resolveBatch(intent,read,repository,identity.uid,input);
          await repository.authorize(identity);
          if(signal.aborted)throw new GikaFault('GIKA_TIMEOUT');
          const raced=await repository.recoverBatch?.(identity.uid,input);
          if(raced){await repository.authorize(identity,'receipt');return gikaInterpretationSchema.parse({text:'Confira as alterações deste pedido.',simulated:false,reads:[],batchConfirmation:raced.confirmation});}
          if('clarification'in resolved)return gikaInterpretationSchema.parse({text:resolved.clarification,simulated:false,reads:[]});
          return gikaInterpretationSchema.parse({text:resolved.plan.items.length === 1 ? 'Confira a tarefa antes de continuar.' : `Confira as ${resolved.plan.items.length} tarefas antes de continuar.`,simulated:false,reads:[],batchConfirmation:issueBatchConfirmation(identity.uid,input,resolved.plan)});
        }
        if (calls[0]?.name === 'reschedule_task') {
          const scoped = scopedIntent(input.text, calls[0].args);
          const intent = validateReschedule(calls[0].args, scoped.text, current);
          if ('clarification' in intent) { assessMissingIntent('reschedule_task', 'verified'); return gikaInterpretationSchema.parse({ text: intent.clarification, simulated: false, reads: [], rescheduleResolution: { status: 'clarify', candidates: [] } }); }
          const range = { startDate: intent.date, endDate: intent.date, timeZone: current.timeZone };
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.items.length >= 50) read.partial = true;
          if (read.timeZone !== current.timeZone || signal.aborted) throw new GikaFault('GIKA_POLICY');
          const afterRead = await repository.authorize(identity);
          if (afterRead.today !== current.today || afterRead.timeZone !== current.timeZone || afterRead.weekStartsOn !== current.weekStartsOn) throw new GikaFault('GIKA_POLICY');
          const resolved = resolveReschedule(intent, read, true);
          const target = read.items.find(item => item.id === resolved.task?.id);
          if (resolved.task && target && (target.seriesId || target.occurrenceKey)) {
            const raced = await repository.recoverMutation(identity.uid, input);
            if (raced) {
              await repository.authorize(identity, 'receipt');
              if (raced.kind !== 'recurrence') throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outra ação.');
              return gikaInterpretationSchema.parse({ text: 'Confira o escopo antes de alterar a rotina.', simulated: false, reads: [], recurrenceConfirmation: raced.confirmation });
            }
            const prepared = await prepareRecurrence(repository, identity.uid, input, target, 'reschedule', intent.patch, scoped.scope);
            await repository.authorize(identity);
            if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
            return gikaInterpretationSchema.parse({ text: 'unsupported' in prepared ? 'Esse escopo não está disponível para esta tarefa. Use sua agenda.' : 'recurrenceChoice' in prepared ? 'Essa tarefa se repete. Quer alterar só esta ocorrência ou também as próximas?' : 'Confira o escopo antes de alterar a rotina.', simulated: false, reads: [], ...('unsupported' in prepared ? { rescheduleResolution: { status: 'unsupported', candidates: [] } } : prepared) });
          }
          if (resolved.task && scoped.scope && scoped.scope !== 'occurrence') return gikaInterpretationSchema.parse({ text: 'Essa tarefa não faz parte de uma rotina. Peça a alteração de uma tarefa por vez.', simulated: false, reads: [], rescheduleResolution: { status: 'unsupported', candidates: [] } });
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
            ...(committed || resolved.task ? { rescheduleTask: committed ?? resolved.task, ...(receipt ? (receipt.confirmation ? { confirmation: receipt.confirmation } : {}) : { confirmation: issueConfirmation(identity.uid, input, resolved.task!, decision) }) } : { rescheduleResolution: resolved.resolution }) });
        }
        if (calls[0]?.name === 'update_task') {
          const scoped = scopedIntent(input.text, calls[0].args);
          const intent = validateUpdate(calls[0].args, scoped.text, current);
          if ('clarification' in intent) { assessMissingIntent('update_task', 'verified'); return gikaInterpretationSchema.parse({ text: intent.clarification, simulated: false, reads: [], updateResolution: { status: 'clarify', candidates: [] } }); }
          const range = { startDate: intent.date, endDate: intent.date, timeZone: current.timeZone };
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.items.length >= 50) read.partial = true;
          if (read.timeZone !== current.timeZone || signal.aborted) throw new GikaFault('GIKA_POLICY');
          const afterRead = await repository.authorize(identity);
          if (afterRead.today !== current.today || afterRead.timeZone !== current.timeZone || afterRead.weekStartsOn !== current.weekStartsOn) throw new GikaFault('GIKA_POLICY');
          const resolved = resolveUpdate(intent, read, true);
          const target = read.items.find(item => item.id === resolved.task?.id);
          if (resolved.task && target && (target.seriesId || target.occurrenceKey)) {
            const raced = await repository.recoverMutation(identity.uid, input);
            if (raced) {
              await repository.authorize(identity, 'receipt');
              if (raced.kind !== 'recurrence') throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outra ação.');
              return gikaInterpretationSchema.parse({ text: 'Confira o escopo antes de alterar a rotina.', simulated: false, reads: [], recurrenceConfirmation: raced.confirmation });
            }
            const prepared = await prepareRecurrence(repository, identity.uid, input, target, 'update', intent.patch, scoped.scope);
            await repository.authorize(identity);
            if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
            return gikaInterpretationSchema.parse({ text: 'unsupported' in prepared ? 'Esse escopo não está disponível para esta tarefa. Use sua agenda.' : 'recurrenceChoice' in prepared ? 'Essa tarefa se repete. Quer alterar só esta ocorrência ou também as próximas?' : 'Confira o escopo antes de alterar a rotina.', simulated: false, reads: [], ...('unsupported' in prepared ? { updateResolution: { status: 'unsupported', candidates: [] } } : prepared) });
          }
          if (resolved.task && scoped.scope && scoped.scope !== 'occurrence') return gikaInterpretationSchema.parse({ text: 'Essa tarefa não faz parte de uma rotina. Peça a alteração de uma tarefa por vez.', simulated: false, reads: [], updateResolution: { status: 'unsupported', candidates: [] } });
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
          const scoped = scopedIntent(input.text, calls[0].args);
          const intent = validateCompletion(calls[0].args, scoped.text, current);
          if ('clarification' in intent) { assessMissingIntent('complete_task', 'verified'); return gikaInterpretationSchema.parse({ text: intent.clarification, simulated: false, reads: [], completionResolution: { status: 'clarify', candidates: [] } }); }
          const range = { startDate: intent.date, endDate: intent.date, timeZone: current.timeZone };
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.items.length >= 50) read.partial = true;
          if (read.timeZone !== current.timeZone || signal.aborted) throw new GikaFault('GIKA_POLICY');
          const afterRead = await repository.authorize(identity);
          if (afterRead.today !== current.today || afterRead.timeZone !== current.timeZone || afterRead.weekStartsOn !== current.weekStartsOn) throw new GikaFault('GIKA_POLICY');
          const resolved = resolveCompletion(intent, read, true);
          const target = read.items.find(item => item.id === resolved.task?.id);
          if (resolved.task && target && (target.seriesId || target.occurrenceKey)) {
            const raced = await repository.recoverMutation(identity.uid, input);
            if (raced) {
              await repository.authorize(identity, 'receipt');
              if (raced.kind !== 'recurrence') throw new AppError(409, 'OPERATION_MISMATCH', 'Este pedido já foi usado com outra ação.');
              return gikaInterpretationSchema.parse({ text: 'Confira o escopo antes de alterar a rotina.', simulated: false, reads: [], recurrenceConfirmation: raced.confirmation });
            }
            const prepared = await prepareRecurrence(repository, identity.uid, input, target, 'complete', { status: 'completed' }, scoped.scope);
            await repository.authorize(identity);
            if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
            return gikaInterpretationSchema.parse({ text: 'unsupported' in prepared ? 'Esse escopo não está disponível para esta tarefa. Use sua agenda.' : 'recurrenceChoice' in prepared ? 'Essa tarefa se repete. Quer alterar só esta ocorrência ou também as próximas?' : 'Confira o escopo antes de alterar a rotina.', simulated: false, reads: [], ...('unsupported' in prepared ? { completionResolution: { status: 'unsupported', candidates: [] } } : prepared) });
          }
          if (resolved.task && scoped.scope && scoped.scope !== 'occurrence') return gikaInterpretationSchema.parse({ text: 'Essa tarefa não faz parte de uma rotina. Peça a alteração de uma tarefa por vez.', simulated: false, reads: [], completionResolution: { status: 'unsupported', candidates: [] } });
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
        const ranges = calls.map(call => { if (call.name === 'create_task' || call.name === 'complete_task' || call.name === 'update_task' || call.name === 'reschedule_task' || call.name === 'batch_complete' || call.name === 'batch_reschedule' || call.name === 'propose_organization') throw new GikaFault('GIKA_POLICY'); return readRange(call, current); });
        const reads = [];
        for (const range of ranges) {
          if (signal.aborted) throw new GikaFault('GIKA_TIMEOUT');
          const read = readResultSchema.parse(await repository.read(identity.uid, range));
          if (read.items.length >= 50) read.partial = true;
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
    } finally { response.removeListener('close', close); }
  });
  return router;
}
