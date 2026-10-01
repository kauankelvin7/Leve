import { describe, expect, it } from 'vitest';
import { resolveCreationIntent, validateCreation, validateToolCalls } from '../../server/gika/createPolicy';
const context = { today: '2026-10-01', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
describe('M3-T1 strict creation policy', () => {
  it.each([['Academia amanhã', 'Academia', '2026-10-02'], ['Adiciona estudar Java sábado', 'estudar Java', '2026-10-03'], ['Cria uma tarefa para revisar currículo amanhã', 'revisar currículo', '2026-10-02'], ['Academia sexta', 'Academia', '2026-10-02'], ['Cria ler em 02/10/2026', 'ler', '2026-10-02']])('data/título civil determinísticos %s', (text, title, dueDate) => {
    const intent = resolveCreationIntent(text, context); expect(intent.task).toMatchObject({ title, dueDate, dueTime: null, timeZone: context.timeZone });
  });
  it.each(['Cria uma tarefa', 'Academia', 'Cria amanhã', 'Cria Academia próxima sexta', 'Cria Academia toda semana', 'Cria Academia todo sábado', 'Cria duas tarefas amanhã', 'O que tenho hoje?', 'Tenho Academia amanhã', 'Mostra Academia amanhã'])('ambiguidade/ação fora de escopo não executa %s', text => {
    expect(resolveCreationIntent(text, context).task).toBeUndefined();
  });
  it('hoje sexta, null sem data explícita e horário/DST usam domínio existente', () => {
    expect(resolveCreationIntent('Academia sexta', { ...context, today: '2026-10-02' }).task?.dueDate).toBe('2026-10-02');
    expect(resolveCreationIntent('Cria ler sem data', context).task?.dueDate).toBeNull();
    expect(resolveCreationIntent('Cria Academia amanhã às 14:30', context).task?.dueTime).toBe('14:30');
    expect(resolveCreationIntent('Cria ler 2026-02-30', context).task).toBeUndefined();
    expect(resolveCreationIntent('Cria ler 2026-03-08 às 02:30', { ...context, timeZone: 'America/New_York' }).task).toBeUndefined();
  });
  it('não aceita título/data inventados, owner/UID/extra fields, batch ou tools posteriores', () => {
    expect(() => validateCreation({ title: 'Outra', dueDate: '2026-10-02', dueTime: null }, 'Academia amanhã', context)).toThrow('GIKA_POLICY');
    expect(() => validateCreation({ title: 'Academia', dueDate: '2026-10-03', dueTime: null }, 'Academia amanhã', context)).toThrow('GIKA_POLICY');
    for (const field of ['uid', 'owner', 'path', 'seriesId']) expect(() => validateToolCalls([{ name: 'create_task', args: { title: 'Academia', dueDate: '2026-10-02', dueTime: null, [field]: 'arbitrary' } }])).toThrow();
    expect(() => validateToolCalls([{ name: 'create_task', args: { dueDate: null, dueTime: null } }])).toThrow();
    expect(() => validateToolCalls([{ name: 'create_task', args: { title: 'Academia', dueDate: null, dueTime: null } }, { name: 'get_today', args: {} }])).toThrow('GIKA_POLICY');
    expect(() => validateToolCalls([{ name: 'complete_task', args: {} }])).toThrow();
  });
});
