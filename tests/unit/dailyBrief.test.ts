import { describe, expect, it } from 'vitest';
import { buildDailyBrief } from '../../apps/web/src/features/activities/buildDailyBrief';

const meta = { revision: 1, schemaVersion: 1 as const, createdAt: '', updatedAt: '', deletedAt: null };

describe('resumo do dia', () => {
  it('usa data brasileira e reúne atividade, anotação e compras', () => {
    const result = buildDailyBrief({
      selectedDay: '2026-09-14',
      today: '2026-09-14',
      activities: [{
        ...meta,
        id: 'atividade-a',
        title: 'Ler um livro',
        descriptionPlain: 'Separar o capítulo sobre hábitos.',
        categoryId: null,
        colorHex: null,
        estimatedMinutes: 30,
        kind: 'task',
        status: 'pending',
        completedAt: null,
        seriesId: null,
        occurrenceKey: null,
        startsAt: null,
        endsAt: null,
        dueAt: '2026-09-14T23:40:00Z',
        reminderSpecs: [],
        schedule: { type: 'task', dueDate: '2026-09-14', dueTime: '20:40', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' },
      }],
      notes: [{ ...meta, id: 'nota-a', title: 'Pagamento', plainText: 'Pagar os 30 reais do João.', bodyDoc: { type: 'doc', content: [] }, paperColorPreset: 'butter', pinned: false, linkedDate: '2026-09-14', linkedActivityIds: [] }],
      shoppingItems: [{ ...meta, id: 'item-a', parentId: 'lista-a', listId: 'lista-a', name: 'Café', quantityValue: 1, unit: 'pacote', unitLabel: '', detail: '', sortOrder: 0, checked: false, checkedAt: null }],
    });

    expect(result.visual).toContain('Hoje 14/09/2026');
    expect(result.visual).toContain('Ler um livro, por cerca de 30 minutos, às 20 horas e 40 minutos');
    expect(result.visual).toContain('Pagar os 30 reais do João');
    expect(result.visual).toContain('Nas compras, faltam Café');
    expect(result.spoken).toContain('Hoje 14 de setembro de 2026');
  });

  it('informa quando o dia não tem pendências', () => {
    const result = buildDailyBrief({ selectedDay: '2026-09-15', today: '2026-09-14', activities: [], notes: [], shoppingItems: [] });
    expect(result.visual).toBe('No dia 15/09/2026, não há nada pendente.');
  });
});
