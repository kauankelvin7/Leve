import { describe, expect, it } from 'vitest';
import { uniqueActivitiesForLinking } from '../../apps/web/src/features/notes/activityLinking';

const activity = (id: string, seriesId: string | null, occurrenceKey: string) => ({ id, title: id, seriesId, occurrenceKey, deletedAt: null });

describe('atividades vinculáveis em notas', () => {
  it('mostra uma opção por série e preserva atividades independentes', () => {
    const result = uniqueActivitiesForLinking([
      activity('recorrente-2', 'serie-a', '2026-09-12'), activity('avulsa', null, ''), activity('recorrente-1', 'serie-a', '2026-09-10'), activity('outra', 'serie-b', '2026-09-11'),
    ]);
    expect(result.map(item => item.id)).toEqual(['recorrente-1', 'avulsa', 'outra']);
  });

  it('mantém selecionada a ocorrência já vinculada ao editar', () => {
    const result = uniqueActivitiesForLinking([activity('a1', 'serie-a', '2026-09-10'), activity('a2', 'serie-a', '2026-09-11')], new Set(['a2']));
    expect(result.map(item => item.id)).toEqual(['a2']);
  });
});
