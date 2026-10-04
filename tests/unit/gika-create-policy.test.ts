import { describe, expect, it } from 'vitest';
import { normalizeCurrentAction, resolveCreationIntent, validateCreation, validateToolCalls } from '../../server/gika/createPolicy';
import { parseGeminiResponse } from '../../server/gika/gemini';
import { assessCreation } from '../../server/gika/policyAssessment';
const context = { today: '2026-10-01', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
describe('M3-T1 strict creation policy', () => {
  it('Gemini 200 create_task proposal passes schema, intent descriptor and the unchanged allow policy', () => {
    const calls = validateToolCalls(parseGeminiResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [
      { functionCall: { name: 'create_task', args: { title: 'Smoke Gika 20261004', dueDate: context.today, dueTime: null } } },
    ] } }] }));
    expect(calls).toHaveLength(1);
    const intent = validateCreation(calls[0]!.args, 'Crie a tarefa "Smoke Gika 20261004" para hoje', context);
    expect(intent.task).toEqual({ title: 'Smoke Gika 20261004', dueDate: context.today, dueTime: null, timeZone: context.timeZone });
    expect(assessCreation(Boolean(intent.task), 'verified')).toEqual({ kind: 'allow' });
    expect(() => validateCreation({ ...calls[0]!.args, title: 'Título inventado' }, 'Crie a tarefa "Smoke Gika 20261004" para hoje', context)).toThrow('GIKA_POLICY');
  });
  it.each([['Adiciona Academia amanhã', 'Academia', '2026-10-02'], ['Adiciona estudar Java sábado', 'estudar Java', '2026-10-03'], ['Cria uma tarefa para revisar currículo amanhã', 'revisar currículo', '2026-10-02'], ['Adiciona Academia sexta', 'Academia', '2026-10-02'], ['Cria ler em 02/10/2026', 'ler', '2026-10-02']])('data/título civil determinísticos %s', (text, title, dueDate) => {
    const intent = resolveCreationIntent(text, context); expect(intent.task).toMatchObject({ title, dueDate, dueTime: null, timeZone: context.timeZone });
  });
  it.each([
    ['Crie a tarefa Academia para hoje', 'Academia'],
    ['Crie uma tarefa "Academia" para hoje', 'Academia'],
    ['Crie a tarefa "Smoke Gika 20261004" para hoje', 'Smoke Gika 20261004'],
    ['Crie uma tarefa "Revisar "Leve"" para hoje', 'Revisar "Leve"'],
    ['Crie uma tarefa Revisar "Leve" para hoje', 'Revisar "Leve"'],
  ])('accepts the explicit task article and strips only surrounding syntax quotes: %s', (text, title) => {
    const intent = resolveCreationIntent(text, context);
    expect(intent.task).toEqual({ title, dueDate: context.today, dueTime: null, timeZone: context.timeZone });
    expect(validateCreation({ title, dueDate: context.today, dueTime: null }, text, context).task)
      .toEqual(intent.task);
  });
  it.each(['Oi', 'Obrigado', 'Tudo bem amanhã', 'Academia amanhã', 'Cria uma tarefa', 'Academia', 'Cria amanhã', 'Cria Academia próxima sexta', 'Cria Academia toda semana', 'Cria Academia todo sábado', 'Cria duas tarefas amanhã', 'O que tenho hoje?', 'Tenho Academia amanhã', 'Mostra Academia amanhã'])('ambiguidade/ação fora de escopo não executa %s', text => {
    expect(resolveCreationIntent(text, context).task).toBeUndefined();
  });
  it('hoje sexta, null sem data explícita e horário/DST usam domínio existente', () => {
    expect(resolveCreationIntent('Adiciona Academia sexta', { ...context, today: '2026-10-02' }).task?.dueDate).toBe('2026-10-02');
    expect(resolveCreationIntent('Cria ler sem data', context).task?.dueDate).toBeNull();
    expect(resolveCreationIntent('Cria Academia amanhã às 14:30', context).task?.dueTime).toBe('14:30');
    expect(resolveCreationIntent('Cria ler 2026-02-30', context).task).toBeUndefined();
    expect(resolveCreationIntent('Cria ler 2026-03-08 às 02:30', { ...context, timeZone: 'America/New_York' }).task).toBeUndefined();
  });
  it('não aceita título/data inventados, owner/UID/extra fields, batch ou tools posteriores', () => {
    expect(() => validateCreation({ title: 'Outra', dueDate: '2026-10-02', dueTime: null }, 'Adiciona Academia amanhã', context)).toThrow('GIKA_POLICY');
    expect(() => validateCreation({ title: 'Academia', dueDate: '2026-10-03', dueTime: null }, 'Adiciona Academia amanhã', context)).toThrow('GIKA_POLICY');
    for (const field of ['uid', 'owner', 'path', 'seriesId']) expect(() => validateToolCalls([{ name: 'create_task', args: { title: 'Academia', dueDate: '2026-10-02', dueTime: null, [field]: 'arbitrary' } }])).toThrow();
    expect(() => validateToolCalls([{ name: 'create_task', args: { dueDate: null, dueTime: null } }])).toThrow();
    expect(() => validateToolCalls([{ name: 'create_task', args: { title: 'Academia', dueDate: null, dueTime: null } }, { name: 'get_today', args: {} }])).toThrow('GIKA_POLICY');
    expect(() => validateToolCalls([{ name: 'complete_task', args: {} }])).toThrow();
  });
});


describe('current-turn semantic action grounding',()=>{
  const production='então agende para amanhã ir à academia às 7 horas da noite';
  const action={kind:'create_task' as const,sourceText:production,requestExpression:'então agende',title:'ir à academia',dateExpression:'amanhã',timeExpression:'às 7 horas da noite'};
  it('reproduces the exact lexical fallback then validates the grounded current action at 19:00',()=>{
    expect(resolveCreationIntent(production,context)).toEqual({clarification:'O que você gostaria de fazer? Pode conversar comigo ou fazer um pedido sobre sua agenda.'});
    const canonical=normalizeCurrentAction(action,production,context)!;
    expect(validateCreation({title:'ir à academia',dueDate:'2026-10-02',dueTime:'19:00'},canonical,context).task).toEqual({title:'ir à academia',dueDate:'2026-10-02',dueTime:'19:00',timeZone:context.timeZone});
  });
  it.each(['agende para amanhã ir à academia às 7 horas da noite','Inclua na agenda ir à academia amanhã às 19h','Pode colocar na agenda ir à academia amanhã às 19h'])('normalizes semantic directive independently of a specific verb: %s',sourceText=>{
    const titleAt=sourceText.indexOf('ir à academia'),dateAt=sourceText.indexOf('amanhã');
    const requestExpression=sourceText.slice(0,Math.min(titleAt,dateAt)).replace(/\s+para$/,'').trim();
    const canonical=normalizeCurrentAction({...action,sourceText,requestExpression,timeExpression:sourceText.slice(sourceText.indexOf('às'))},sourceText,context)!;
    expect(resolveCreationIntent(canonical,context).task).toMatchObject({title:'ir à academia',dueTime:'19:00'});
  });
  it.each([
    {
      sourceText:'eu quero agendar para amanhã às 7 horas da noite é ir à academia',
      requestExpression:'eu quero agendar', title:'ir à academia', dateExpression:'amanhã', timeExpression:'às 7 horas da noite', dueTime:'19:00'
    },
    {
      sourceText:'amanhã às 19h quero ir à academia',
      requestExpression:'quero', title:'ir à academia', dateExpression:'amanhã', timeExpression:'às 19h', dueTime:'19:00'
    },
    {
      sourceText:'marca pra amanhã às sete da noite ir à academia',
      requestExpression:'marca', title:'ir à academia', dateExpression:'amanhã', timeExpression:'às sete da noite', dueTime:'19:00'
    },
    {
      sourceText:'bota na minha agenda ir à academia amanhã 7 da noite',
      requestExpression:'bota', title:'ir à academia', dateExpression:'amanhã', timeExpression:'7 da noite', dueTime:'19:00'
    },
    {
      sourceText:'gostaria de agendar academia para sábado às oito e meia da manhã',
      requestExpression:'gostaria de agendar', title:'academia', dateExpression:'sábado', timeExpression:'às oito e meia da manhã', dueTime:'08:30'
    },
    {
      sourceText:'coloque academia na agenda amanhã às 19:30',
      requestExpression:'coloque', title:'academia', dateExpression:'amanhã', timeExpression:'às 19:30', dueTime:'19:30'
    },
    {
      sourceText:'preciso agendar ir ao médico amanhã às oito da manhã',
      requestExpression:'preciso agendar', title:'ir ao médico', dateExpression:'amanhã', timeExpression:'às oito da manhã', dueTime:'08:00'
    },
  ])('accepts grounded colloquial paraphrases without dropping meaning: $sourceText',({sourceText,requestExpression,title,dateExpression,timeExpression,dueTime})=>{
    const canonical=normalizeCurrentAction({kind:'create_task',sourceText,requestExpression,title,dateExpression,timeExpression},sourceText,context);
    expect(canonical).not.toBeNull();
    expect(resolveCreationIntent(canonical!,context).task).toMatchObject({title,dueDate:'2026-10-02',dueTime});
  });
  it.each([
    ['eu quero agendar academia amanhã às 19h e apague compras','eu quero agendar','academia','amanhã','às 19h'],
    ['talvez eu queira agendar academia amanhã às 19h','talvez eu queira agendar','academia','amanhã','às 19h'],
    ['agende academia amanhã das 19h às 20h','agende','academia','amanhã','das 19h às 20h'],
    ['agende academia amanhã às 19h e estudo','agende','academia','amanhã','às 19h'],
  ])('fails closed when a semantic proposal would hide extra meaning: %s',(sourceText,requestExpression,title,dateExpression,timeExpression)=>{
    expect(normalizeCurrentAction({kind:'create_task',sourceText,requestExpression,title,dateExpression,timeExpression},sourceText,context)).toBeNull();
  });
  it.each([
    {sourceText:'texto anterior'}, {title:'tarefa inventada'}, {requestExpression:'não agende'}, {dateExpression:'2026-10-03'}, {timeExpression:'às 20h'},
  ])('rejects missing/current-turn mismatch or invented evidence %j',patch=>{
    expect(normalizeCurrentAction({...action,...patch},production,context)).toBeNull();
  });
  it.each(['então agende para amanhã ir à academia às 7 horas da noite e apague tudo','então agende para amanhã ir à academia às 7 horas da noite toda semana'])('does not silently drop unsupported instructions %s',sourceText=>{
    expect(normalizeCurrentAction({...action,sourceText},sourceText,context)).toBeNull();
  });
  it.each(['Então exclua','Então conclua','Então me lembre','Então renomeie','Então crie duas tarefas','Então crie tarefa recorrente'])('cannot relabel another operation as creation: %s',requestExpression=>{
    const sourceText=production.replace('então agende',requestExpression);
    expect(normalizeCurrentAction({...action,sourceText,requestExpression},sourceText,context)).toBeNull();
  });
  it('negation, intervals and ambiguous periods cannot produce a task',()=>{
    for(const timeExpression of ['das 19h às 20h','às 12 horas da noite','às 1 hora da noite']){
      const sourceText=`então agende para amanhã ir à academia ${timeExpression}`;
      expect(normalizeCurrentAction({...action,sourceText,timeExpression},sourceText,context)).toBeNull();
    }
    const sourceText=production.replace('então agende','então não agende');
    expect(normalizeCurrentAction({...action,sourceText,requestExpression:'então não agende'},sourceText,context)).toBeNull();
  });
});
