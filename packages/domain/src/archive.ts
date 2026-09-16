import { z } from 'zod';
import { colorThemeIds, appearances } from './themes';

const archiveEntitySchema = z.object({ id: z.string().min(1).max(128) }).passthrough();

export const accountArchiveSchema = z.object({
  format: z.literal('leve-account-export'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  profile: z.object({
    displayName: z.string().min(1).max(80),
    locale: z.literal('pt-BR'),
    timeZone: z.string().min(1).max(100),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    reduceTransparency: z.boolean(),
    colorTheme: z.enum(colorThemeIds).optional(),
    appearance: z.enum(appearances).optional(),
    avatarStyle: z.literal('avataaars').optional(),
    avatarSeed: z.string().min(1).max(80).optional(),
  }).strict(),
  data: z.object({
    categories: z.array(archiveEntitySchema).max(50),
    activities: z.array(archiveEntitySchema).max(5000),
    timeEntries: z.array(archiveEntitySchema).max(20_000).optional(),
    series: z.array(archiveEntitySchema).max(1000).default([]),
    notes: z.array(archiveEntitySchema).max(500),
    shoppingLists: z.array(archiveEntitySchema.extend({ items: z.array(archiveEntitySchema).max(200) })).max(50),
  }).strict(),
}).strict();

export type AccountArchive = z.infer<typeof accountArchiveSchema>;

export function archiveReferenceErrors(archive: AccountArchive): string[] {
  const categoryIds = new Set(archive.data.categories.map(item => item.id));
  const activityIds = new Set(archive.data.activities.map(item => item.id));
  const seriesIds = new Set(archive.data.series.map(item => item.id));
  const listIds = new Set(archive.data.shoppingLists.map(item => item.id));
  const errors: string[] = [];
  const has = (value: unknown, values: Set<string>) => typeof value !== 'string' || values.has(value);
  for (const activity of archive.data.activities) {
    if (!has(activity.categoryId, categoryIds)) errors.push(`activity:${activity.id}:categoryId`);
    if (!has(activity.seriesId, seriesIds)) errors.push(`activity:${activity.id}:seriesId`);
  }
  for (const entry of archive.data.timeEntries ?? []) {
    if (!has(entry.activityId, activityIds)) errors.push(`timeEntry:${entry.id}:activityId`);
  }
  for (const series of archive.data.series) {
    const activity = series.activity as Record<string, unknown> | undefined;
    if (activity && !has(activity.categoryId, categoryIds)) errors.push(`series:${series.id}:activity.categoryId`);
    if (!has(series.previousSeriesId, seriesIds)) errors.push(`series:${series.id}:previousSeriesId`);
  }
  for (const note of archive.data.notes) {
    const linked = note.linkedActivityIds;
    if (Array.isArray(linked)) linked.forEach((id, index) => { if (!has(id, activityIds)) errors.push(`note:${note.id}:linkedActivityIds.${index}`); });
  }
  for (const list of archive.data.shoppingLists) {
    if (!has(list.sourceTemplateId, listIds)) errors.push(`shoppingList:${list.id}:sourceTemplateId`);
  }
  return errors;
}

export const accountImportSchema = z.object({
  importId: z.uuid(),
  archive: accountArchiveSchema,
}).strict();

export const accountDeleteSchema = z.object({ confirmation: z.literal('EXCLUIR') }).strict();
