import type { ActivityInput } from '../../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../../packages/domain/src/identity';
import type { StoredActivity } from './calendarModel';

export type CalendarMutationScope = 'occurrence' | 'future';

type CalendarCommandIds = {
  operationId: string;
  clientCreatedAt: string;
  newSeriesId?: string;
};

export function buildCalendarUpdateCommand(
  item: StoredActivity,
  activity: ActivityInput,
  scope: CalendarMutationScope,
  ids: CalendarCommandIds,
): CommandEnvelope {
  if (!Number.isInteger(item.revision) || item.revision < 1) {
    throw new Error('A atividade precisa de uma revisão válida antes de ser alterada.');
  }

  if (scope === 'future') {
    if (!item.seriesId || !item.occurrenceKey) {
      throw new Error('Somente ocorrências recorrentes podem alterar esta e as próximas.');
    }
    if (!ids.newSeriesId) {
      throw new Error('A separação da série precisa de um identificador novo.');
    }
    return {
      command: 'activity.updateFuture',
      operationId: ids.operationId,
      entityId: item.id,
      expectedRevision: item.revision,
      clientCreatedAt: ids.clientCreatedAt,
      payload: { activity, newSeriesId: ids.newSeriesId },
    };
  }

  return {
    command: 'activity.update',
    operationId: ids.operationId,
    entityId: item.id,
    expectedRevision: item.revision,
    clientCreatedAt: ids.clientCreatedAt,
    payload: activity,
  };
}
