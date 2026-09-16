import { collection, limit, query, where } from 'firebase/firestore';
import type { Activity } from '../../../../../../packages/domain/src/content';
import { firestore } from '../../../platform/firebase';
import { useLiveQueries } from '../../content/useLiveQueries';
import { useAuth } from '../../identity/AuthProvider';
import { normalizeCalendarPageSize, type StoredActivity } from './calendarModel';

type CalendarRangeOptions = {
  startDate: string;
  endDate: string;
  categoryId?: string;
  pageSize?: number;
};

/**
 * Reads only the signed-in user's bounded calendar range.
 *
 * Category filtering intentionally stays client-side so switching a filter does
 * not create extra Firestore listeners or index requirements. The underlying
 * live-query cache is already scoped by Firebase uid. Query limits are clamped
 * to the Firestore security-rule maximum so future callers cannot exceed it.
 */
export function useCalendarRange({ startDate, endDate, categoryId = '', pageSize = 50 }: CalendarRangeOptions) {
  const { user } = useAuth();
  const safePageSize = normalizeCalendarPageSize(pageSize);
  const key = `calendar:${startDate}:${endDate}:${safePageSize}`;
  const live = useLiveQueries(key, () => {
    if (!user || !firestore || startDate > endDate) return [];
    const root = collection(firestore, `users/${user.uid}/activities`);
    return [
      query(root, where('schedule.dueDate', '>=', startDate), where('schedule.dueDate', '<=', endDate), limit(safePageSize)),
      query(root, where('schedule.startDate', '<=', endDate), where('schedule.endDate', '>=', startDate), limit(safePageSize)),
      query(root, where('schedule.startDate', '<=', endDate), where('schedule.endDateExclusive', '>', startDate), limit(safePageSize)),
    ];
  }, safePageSize);

  const items = (live.items as (Activity & { id: string })[])
    .filter((item): item is StoredActivity => !item.deletedAt)
    .filter(item => !categoryId || item.categoryId === categoryId);

  return { ...live, items };
}
