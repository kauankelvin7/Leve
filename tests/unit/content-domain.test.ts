import { describe, expect, it } from 'vitest';
import { activityInputSchema, moveScheduleToDate, noteInputSchema, pendingShoppingItemDelta, recurrenceDates, recurrenceDatesThrough } from '../../packages/domain/src/content';
import { commandEnvelopeSchema } from '../../packages/domain/src/identity';
import { accountArchiveSchema, archiveReferenceErrors } from '../../packages/domain/src/archive';

describe('Domínio de conteúdo persistente', () => {
  it('materializa recorrência mensal com política de último dia ou pulo', () => {
    expect(recurrenceDates('2026-01-31', { frequency: 'monthly', interval: 1, until: null, count: 4, monthlyPolicy: 'lastDay' })).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    expect(recurrenceDates('2026-01-31', { frequency: 'monthly', interval: 1, until: null, count: 3, monthlyPolicy: 'skip' })).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });

  it('move eventos mantendo a duração civil e o fuso', () => {
    const schedule = { type: 'event' as const, allDay: false as const, startDate: '2026-09-12', startTime: '23:30', endDate: '2026-09-13', endTime: '01:00', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' as const };
    expect(moveScheduleToDate(schedule, '2026-09-19')).toMatchObject({ startDate: '2026-09-19', endDate: '2026-09-20' });
    expect(activityInputSchema.safeParse({ title: 'Evento', descriptionPlain: '', categoryId: null, schedule, reminderSpecs: [] }).success).toBe(true);
  });

  it('mantém identidade civil na recorrência após ano bissexto e retomada', () => {
    const rule = { frequency: 'monthly' as const, interval: 1, until: null, count: null, monthlyPolicy: 'lastDay' as const };
    expect(recurrenceDates('2028-01-31', rule, 4)).toEqual(['2028-01-31', '2028-02-29', '2028-03-31', '2028-04-30']);
    expect(recurrenceDates('2028-01-31', rule, 2, 4)).toEqual(['2028-05-31', '2028-06-30']);
    expect(moveScheduleToDate({ type: 'task', dueDate: '2028-01-31', dueTime: '09:00', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' }, '2028-02-29')).toMatchObject({ dueDate: '2028-02-29', timeZone: 'America/Sao_Paulo' });
  });

  it('limita a materialização ao horizonte civil sem consumir ocorrências futuras', () => {
    const rule = { frequency: 'weekly' as const, interval: 1, until: null, count: 10, monthlyPolicy: 'lastDay' as const };
    expect(recurrenceDatesThrough('2026-09-01', rule, '2026-09-20')).toEqual(['2026-09-01', '2026-09-08', '2026-09-15']);
    expect(recurrenceDatesThrough('2026-09-01', rule, '2026-09-30', 90, 3)).toEqual(['2026-09-22', '2026-09-29']);
  });

  it('mantém o resumo de compras separado da marcação e da lixeira', () => {
    expect(pendingShoppingItemDelta('create')).toBe(1);
    expect(pendingShoppingItemDelta('setChecked', false, true)).toBe(-1);
    expect(pendingShoppingItemDelta('setChecked', true, false)).toBe(1);
    expect(pendingShoppingItemDelta('trash', false)).toBe(-1);
    expect(pendingShoppingItemDelta('restore', false)).toBe(1);
    expect(pendingShoppingItemDelta('trash', true)).toBe(0);
  });

  it('aceita dependências explícitas na outbox sem afrouxar o envelope', () => {
    const first = '10000000-0000-4000-8000-000000000001';
    expect(commandEnvelopeSchema.parse({ command: 'note.save', operationId: '10000000-0000-4000-8000-000000000002', entityId: 'nota', expectedRevision: 0, payload: {}, dependsOn: [first] }).dependsOn).toEqual([first]);
  });

  it('rejeita HTML arbitrário no documento de nota', () => {
    const result = noteInputSchema.safeParse({ title: 'Nota', bodyDoc: { type: 'doc', content: [{ type: 'script', text: 'alert(1)' }] }, paperColorPreset: 'butter', pinned: false, linkedDate: null, linkedActivityIds: [] });
    expect(result.success).toBe(false);
  });

  it('valida a versão e os limites básicos de uma exportação', () => {
    const archive = { format: 'leve-account-export', version: 1, exportedAt: '2026-09-12T12:00:00.000Z', profile: { displayName: 'Conta', locale: 'pt-BR', timeZone: 'America/Sao_Paulo', weekStartsOn: 1, reduceTransparency: false }, data: { categories: [], activities: [], series: [], notes: [], shoppingLists: [] } };
    expect(accountArchiveSchema.parse(archive).version).toBe(1);
    expect(accountArchiveSchema.safeParse({ ...archive, version: 2 }).success).toBe(false);
  });

  it('impede importar vínculos que seriam descartados silenciosamente', () => {
    const archive = accountArchiveSchema.parse({ format: 'leve-account-export', version: 1, exportedAt: '2026-09-12T12:00:00.000Z', profile: { displayName: 'Conta', locale: 'pt-BR', timeZone: 'America/Sao_Paulo', weekStartsOn: 1, reduceTransparency: false }, data: { categories: [], activities: [{ id: 'atividade', categoryId: 'categoria-ausente' }], series: [], notes: [{ id: 'nota', linkedActivityIds: ['atividade-ausente'] }], shoppingLists: [{ id: 'lista', sourceTemplateId: 'modelo-ausente', items: [] }] } });
    expect(archiveReferenceErrors(archive)).toEqual(['activity:atividade:categoryId', 'note:nota:linkedActivityIds.0', 'shoppingList:lista:sourceTemplateId']);
  });
});
