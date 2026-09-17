import { describe, expect, it } from 'vitest';
import {
  createPlannerDraft,
  plannerDraftFromSearchParams,
  plannerDraftToSearchParams,
} from '../../apps/web/src/features/activities/calendar/calendarDraftModel';

describe('calendar draft model', () => {
  it('creates a snapped draft from a dragged interval', () => {
    expect(createPlannerDraft('2026-09-17', 8 * 60 + 7, 9 * 60 + 38)).toEqual({
      startDate: '2026-09-17',
      startTime: '08:00',
      endDate: '2026-09-17',
      endTime: '09:45',
    });
  });

  it('creates a one-hour draft for a click without a dragged duration', () => {
    expect(createPlannerDraft('2026-09-17', 14 * 60, 14 * 60)).toEqual({
      startDate: '2026-09-17',
      startTime: '14:00',
      endDate: '2026-09-17',
      endTime: '15:00',
    });
  });

  it('keeps the draft valid at the end of the day', () => {
    expect(createPlannerDraft('2026-09-17', 23 * 60 + 55, 23 * 60 + 55)).toEqual({
      startDate: '2026-09-17',
      startTime: '23:00',
      endDate: '2026-09-18',
      endTime: '00:00',
    });
  });

  it('round-trips a valid draft through search params', () => {
    const draft = {
      startDate: '2026-09-17',
      startTime: '14:00',
      endDate: '2026-09-17',
      endTime: '15:30',
    };
    expect(plannerDraftFromSearchParams(plannerDraftToSearchParams(draft))).toEqual(draft);
  });

  it('rejects malformed, reversed, too short and oversized URL drafts', () => {
    const params = new URLSearchParams('dia=2026-09-17&nova=1&tipo=evento&inicio=14:00&fimDia=2026-09-17&fim=13:00');
    expect(plannerDraftFromSearchParams(params)).toBeNull();

    params.set('fim', '14:05');
    expect(plannerDraftFromSearchParams(params)).toBeNull();

    params.set('inicio', '25:00');
    expect(plannerDraftFromSearchParams(params)).toBeNull();

    expect(plannerDraftFromSearchParams(new URLSearchParams('dia=2026-09-17&nova=1'))).toBeNull();

    expect(plannerDraftFromSearchParams(new URLSearchParams('dia=2026-09-17&nova=1&tipo=evento&inicio=00:00&fimDia=2026-09-19&fim=00:01'))).toBeNull();
  });
});
