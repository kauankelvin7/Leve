type LinkableActivity = {
  id: string;
  title: string;
  seriesId?: string | null;
  occurrenceKey?: string | null;
  deletedAt?: string | null;
};

export function uniqueActivitiesForLinking<T extends LinkableActivity>(activities: T[], selectedIds: ReadonlySet<string> = new Set()): T[] {
  const groups = new Map<string, T>();
  for (const activity of activities) {
    if (activity.deletedAt) continue;
    const groupId = activity.seriesId || activity.id;
    const current = groups.get(groupId);
    if (!current || selectedIds.has(activity.id) || (!selectedIds.has(current.id) && (activity.occurrenceKey ?? activity.id) < (current.occurrenceKey ?? current.id))) groups.set(groupId, activity);
  }
  const result = [...groups.values()];
  const selected = result.filter(activity => selectedIds.has(activity.id));
  const unselected = result.filter(activity => !selectedIds.has(activity.id));
  return [...selected, ...unselected].slice(0, 20);
}
