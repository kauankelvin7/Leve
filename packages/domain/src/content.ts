import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import { entityIdSchema, timeZoneSchema } from './identity.ts';

export const civilDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  try { return Temporal.PlainDate.from(value).toString() === value; } catch { return false; }
}, 'Data inválida.');
export const civilTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const title = z.string().trim().min(1, 'Informe um título.').max(120);
const reminderSchema = z.object({ id: entityIdSchema, minutesBefore: z.number().int().min(0).max(43_200) }).strict();

const taskSchedule = z.object({
  type: z.literal('task'), dueDate: civilDateSchema.nullable(), dueTime: civilTimeSchema.nullable(),
  timeZone: timeZoneSchema, disambiguation: z.enum(['reject', 'earlier', 'later']).default('reject'),
}).strict().refine(value => !value.dueTime || Boolean(value.dueDate), 'Escolha uma data antes do horário.');
const timedSchedule = z.object({
  type: z.literal('event'), allDay: z.literal(false),
  startDate: civilDateSchema, startTime: civilTimeSchema, endDate: civilDateSchema, endTime: civilTimeSchema,
  timeZone: timeZoneSchema, disambiguation: z.enum(['reject', 'earlier', 'later']).default('reject'),
}).strict();
const allDaySchedule = z.object({
  type: z.literal('event'), allDay: z.literal(true), startDate: civilDateSchema, endDateExclusive: civilDateSchema,
  timeZone: timeZoneSchema,
}).strict().refine(value => value.endDateExclusive > value.startDate, 'O fim deve ser posterior ao início.');

export const activityInputSchema = z.object({
  title, descriptionPlain: z.string().max(5000), categoryId: entityIdSchema.nullable(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  estimatedMinutes: z.number().int().min(5).max(1440).nullable().optional(),
  schedule: z.union([taskSchedule, timedSchedule, allDaySchedule]),
  reminderSpecs: z.array(reminderSchema).max(3),
}).strict().superRefine((value, context) => {
  try {
    const times = scheduleInstants(value.schedule);
    if (times.startsAt && times.endsAt && times.endsAt <= times.startsAt) context.addIssue({ code: 'custom', path: ['schedule'], message: 'O término deve ser posterior ao início.' });
    if (value.reminderSpecs.length && !times.startsAt && !times.dueAt) context.addIssue({ code: 'custom', path: ['reminderSpecs'], message: 'Escolha um horário para configurar lembretes.' });
    if (new Set(value.reminderSpecs.map(reminder => reminder.minutesBefore)).size !== value.reminderSpecs.length) context.addIssue({ code: 'custom', path: ['reminderSpecs'], message: 'Não repita a mesma antecedência.' });
  } catch { context.addIssue({ code: 'custom', path: ['schedule'], message: 'Horário inexistente ou ambíguo neste fuso. Revise o horário ou escolha a ocorrência temporal.' }); }
});

type Schedule = z.infer<typeof taskSchedule> | z.infer<typeof timedSchedule> | z.infer<typeof allDaySchedule>;
export function scheduleInstants(schedule: Schedule): { startsAt: string | null; endsAt: string | null; dueAt: string | null } {
  function instant(date: string, time: string, disambiguation: 'reject' | 'earlier' | 'later') {
    const plain = Temporal.PlainDateTime.from(`${date}T${time}`);
    const zoned = plain.toZonedDateTime(schedule.timeZone, { disambiguation });
    if (!zoned.toPlainDateTime().equals(plain)) throw new Error('Horário inexistente.');
    return zoned.toInstant().toString({ fractionalSecondDigits: 3 });
  }
  if (schedule.type === 'task') return { startsAt: null, endsAt: null, dueAt: schedule.dueDate && schedule.dueTime ? instant(schedule.dueDate, schedule.dueTime, schedule.disambiguation) : null };
  if (schedule.allDay) return { startsAt: null, endsAt: null, dueAt: null };
  return { startsAt: instant(schedule.startDate, schedule.startTime, schedule.disambiguation), endsAt: instant(schedule.endDate, schedule.endTime, schedule.disambiguation), dueAt: null };
}

export type ActivityInput = z.infer<typeof activityInputSchema>;
export type EntityMeta = { id: string; revision: number; schemaVersion: 1; deletedAt: string | null; createdAt: string; updatedAt: string };
export type Activity = ActivityInput & EntityMeta & ReturnType<typeof scheduleInstants> & {
  kind: 'task' | 'event'; status: 'pending' | 'completed' | 'canceled'; completedAt: string | null;
  seriesId: string | null; occurrenceKey: string | null;
};

export const timeEntryManualInputSchema = z.object({
  activityId: entityIdSchema,
  civilDate: civilDateSchema,
  timeZone: timeZoneSchema,
  durationSeconds: z.number().int().min(60).max(86_400),
}).strict();

export const timeEntrySessionInputSchema = z.object({
  activityId: entityIdSchema,
  civilDate: civilDateSchema,
  timeZone: timeZoneSchema,
  durationSeconds: z.number().int().min(30).max(14_400),
  sessionId: z.uuid(),
}).strict();

export type TimeEntry = EntityMeta & {
  activityId: string;
  civilDate: string;
  timeZone: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  source: 'session' | 'manual' | 'timer';
  sessionId?: string;
};

export const recurrenceRuleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']), interval: z.number().int().min(1).max(30),
  until: civilDateSchema.nullable(), count: z.number().int().min(2).max(366).nullable(),
  monthlyPolicy: z.enum(['lastDay', 'skip']),
}).strict().refine(value => !(value.until && value.count), 'Escolha uma data final ou uma quantidade, não ambas.');
export const recurringActivityInputSchema = z.object({ activity: activityInputSchema, recurrence: recurrenceRuleSchema }).strict();
export const recurringFutureUpdateSchema = z.object({ activity: activityInputSchema, newSeriesId: entityIdSchema }).strict();
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

export function recurrenceDates(start: string, rule: RecurrenceRule, maximum = 180, offset = 0): string[] {
  const first = Temporal.PlainDate.from(start);
  const result: string[] = [];
  const limit = Math.min(rule.count ?? offset + maximum, offset + maximum);
  let step = 0;
  while (result.length < limit) {
    let candidate: Temporal.PlainDate;
    if (rule.frequency === 'daily') candidate = first.add({ days: step * rule.interval });
    else if (rule.frequency === 'weekly') candidate = first.add({ weeks: step * rule.interval });
    else {
      const month = first.with({ day: 1 }).add({ months: step * rule.interval });
      if (first.day > month.daysInMonth && rule.monthlyPolicy === 'skip') { step++; continue; }
      candidate = month.with({ day: Math.min(first.day, month.daysInMonth) });
    }
    const value = candidate.toString();
    if (rule.until && value > rule.until) break;
    result.push(value); step++;
  }
  return result.slice(offset);
}

export function recurrenceDatesThrough(start: string, rule: RecurrenceRule, through: string, maximum = 180, offset = 0): string[] {
  return recurrenceDates(start, rule, maximum, offset).filter(date => date <= through);
}

export function moveScheduleToDate(schedule: Schedule, date: string): Schedule {
  const sourceDate = schedule.type === 'task' ? schedule.dueDate : schedule.startDate;
  if (!sourceDate) throw new Error('Uma atividade recorrente precisa de data.');
  const days = Temporal.PlainDate.from(sourceDate).until(Temporal.PlainDate.from(date)).days;
  if (schedule.type === 'task') return { ...schedule, dueDate: date };
  if (schedule.allDay) return { ...schedule, startDate: date, endDateExclusive: Temporal.PlainDate.from(schedule.endDateExclusive).add({ days }).toString() };
  return { ...schedule, startDate: date, endDate: Temporal.PlainDate.from(schedule.endDate).add({ days }).toString() };
}

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(40), colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/), sortOrder: z.number().int().min(0).max(1000),
}).strict();
export type Category = z.infer<typeof categoryInputSchema> & EntityMeta & { archivedAt: string | null };

export type NoteNode = { type: 'doc' | 'paragraph' | 'text' | 'bulletList' | 'orderedList' | 'listItem' | 'hardBreak'; text?: string; content?: NoteNode[]; marks?: { type: 'bold' | 'highlight'; attrs?: { color: null } }[] };
function validDocument(value: unknown): value is NoteNode {
  let textLength = 0;
  let nodes = 0;
  function visit(current: unknown, depth: number, parent: string | null): boolean {
    if (!current || typeof current !== 'object' || Array.isArray(current) || depth > 12 || ++nodes > 5000) return false;
    const node = current as Record<string, unknown>;
    if (Object.keys(node).some(key => !['type', 'text', 'content', 'marks'].includes(key))) return false;
    const allowed: Record<string, string[]> = { doc: ['paragraph', 'bulletList', 'orderedList'], paragraph: ['text', 'hardBreak'], bulletList: ['listItem'], orderedList: ['listItem'], listItem: ['paragraph', 'bulletList', 'orderedList'], text: [], hardBreak: [] };
    if (typeof node.type !== 'string' || !Object.hasOwn(allowed, node.type) || (parent ? !allowed[parent]?.includes(node.type) : node.type !== 'doc')) return false;
    if (node.type === 'text') {
      if (typeof node.text !== 'string' || node.content) return false;
      textLength += node.text.length;
    } else if (node.text !== undefined) return false;
    if (node.marks !== undefined) {
      if (node.type !== 'text' || !Array.isArray(node.marks) || node.marks.length > 2) return false;
      if (!node.marks.every(mark => mark && typeof mark === 'object' && ['bold', 'highlight'].includes(mark.type) && Object.keys(mark).every(key => ['type', 'attrs'].includes(key)) && (mark.attrs === undefined || (mark.type === 'highlight' && JSON.stringify(mark.attrs) === '{"color":null}')))) return false;
    }
    return textLength <= 20_000 && (node.content === undefined || (Array.isArray(node.content) && node.content.every(child => visit(child, depth + 1, node.type as string))));
  }
  return visit(value, 0, null) && new TextEncoder().encode(JSON.stringify(value)).byteLength <= 100 * 1024;
}

export function notePlainText(node: NoteNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(notePlainText).join(node.type === 'paragraph' ? '' : '\n');
}

export const noteInputSchema = z.object({
  title: z.string().trim().min(1).max(100), bodyDoc: z.custom<NoteNode>(validDocument, 'Formatação ou tamanho de nota inválido.'),
  paperColorPreset: z.enum(['butter', 'studies', 'personal', 'health', 'home']), pinned: z.boolean(),
  linkedDate: civilDateSchema.nullable(), linkedActivityIds: z.array(entityIdSchema).max(20),
}).strict();
export type Note = z.infer<typeof noteInputSchema> & EntityMeta & { plainText: string };

export const shoppingListInputSchema = z.object({ title: z.string().trim().min(1).max(100), listKind: z.enum(['regular', 'template', 'cycle']), cycleKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable() }).strict();
export type ShoppingList = z.infer<typeof shoppingListInputSchema> & EntityMeta & { archivedAt: string | null; sourceTemplateId: string | null; itemCount: number; pendingItemCount: number };
export const shoppingCycleInputSchema = z.object({ templateId: entityIdSchema, cycleKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict();
export const shoppingItemInputSchema = z.object({
  listId: entityIdSchema, name: z.string().trim().min(1).max(100), quantityValue: z.number().positive().max(100_000).nullable(),
  unit: z.enum(['un', 'kg', 'g', 'l', 'ml', 'pacote', 'duzia', 'outra']), unitLabel: z.string().max(30), detail: z.string().max(300), sortOrder: z.number().int().min(0).max(100_000),
}).strict().refine(value => value.unit !== 'outra' || value.unitLabel.trim().length > 0, 'Informe a unidade.');
export type ShoppingItem = z.infer<typeof shoppingItemInputSchema> & EntityMeta & { checked: boolean; checkedAt: string | null };

export function pendingShoppingItemDelta(action: 'create' | 'setChecked' | 'trash' | 'restore', wasChecked = false, nextChecked = false) {
  if (action === 'create') return 1;
  if (action === 'setChecked') return wasChecked === nextChecked ? 0 : nextChecked ? -1 : 1;
  if (action === 'trash') return wasChecked ? 0 : -1;
  return wasChecked ? 0 : 1;
}
