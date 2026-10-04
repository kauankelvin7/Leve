import { describe, expect, it } from 'vitest';
import { resolveCreationIntent, validateCreation, validateToolCalls } from '../../server/gika/createPolicy';
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
