import { Temporal } from '@js-temporal/polyfill';
import { calendarPoint, snapCalendarMinute } from './calendarMutationModel';

export type PlannerDraft = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_DRAFT_MINUTES = 24 * 60;

function plainDateTime(date: string, time: string): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from(`${date}T${time}`);
}

export function createPlannerDraft(date: string, startMinute: number, endMinute: number): PlannerDraft {
  const startSnapped = snapCalendarMinute(Math.min(startMinute, endMinute));
  let endSnapped = snapCalendarMinute(Math.max(startMinute, endMinute));
  if (endSnapped <= startSnapped) endSnapped = Math.min(24 * 60, startSnapped + 60);
  if (endSnapped <= startSnapped) {
    const start = calendarPoint(date, Math.max(0, startSnapped - 60));
    const end = calendarPoint(date, startSnapped);
    return { startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time };
  }

  const start = calendarPoint(date, startSnapped);
  const end = calendarPoint(date, endSnapped);
  return { startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time };
}

export function plannerDraftToSearchParams(draft: PlannerDraft): URLSearchParams {
  const params = new URLSearchParams();
  params.set('dia', draft.startDate);
  params.set('nova', '1');
  params.set('tipo', 'evento');
  params.set('inicio', draft.startTime);
  params.set('fimDia', draft.endDate);
  params.set('fim', draft.endTime);
  return params;
}

export function plannerDraftFromSearchParams(params: URLSearchParams): PlannerDraft | null {
  if (params.get('nova') !== '1' || params.get('tipo') !== 'evento') return null;

  const startDate = params.get('dia') ?? '';
  const startTime = params.get('inicio') ?? '';
  const endDate = params.get('fimDia') ?? '';
  const endTime = params.get('fim') ?? '';
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) return null;

  try {
    const start = plainDateTime(startDate, startTime);
    const end = plainDateTime(endDate, endTime);
    const duration = start.until(end).total({ unit: 'minutes' });
    if (!Number.isFinite(duration) || duration < 15 || duration > MAX_DRAFT_MINUTES) return null;
    return {
      startDate: start.toPlainDate().toString(),
      startTime: `${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}`,
      endDate: end.toPlainDate().toString(),
      endTime: `${String(end.hour).padStart(2, '0')}:${String(end.minute).padStart(2, '0')}`,
    };
  } catch {
    return null;
  }
}
