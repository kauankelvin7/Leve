import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { daySuggestion } from '../../apps/web/src/features/gika/proactivity';

type Input = Parameters<typeof daySuggestion>[0];
const today = '2026-10-02';
const task = (id: string): Input['activities'][number] => ({ id, kind: 'task', status: 'pending', deletedAt: null, schedule: { type: 'task', dueDate: today, dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'earlier' } });
const input = (count = 4): Input => ({ today, selectedDay: today, loading: false, error: '', partial: false, activities: Array.from({ length: count }, (_, i) => task(String(i))) });

describe('M8 local facts', () => {
  it.each([0, 1, 3, 6, 151])('normal/outside bounded composition: %i has no suggestion', count => expect(daySuggestion(input(count))).toBeNull());
  it.each([4, 5])('threshold %i is factual and respects existing batch cap', count => expect(daySuggestion(input(count))?.count).toBe(count));
  it('loading, failure, partial and another civil day never claim a full day', () => {
    for (const patch of [{ loading: true }, { error: 'unavailable' }, { partial: true }, { selectedDay: '2026-10-03' }]) expect(daySuggestion({ ...input(), ...patch })).toBeNull();
  });
  it('completed/canceled/trashed/other-day/events are not pending tasks', () => {
    for (const patch of [{ status: 'completed' as const }, { status: 'canceled' as const }, { deletedAt: '2026-10-02T00:00:00Z' }, { schedule: { ...task('0').schedule, dueDate: '2026-10-03' } }, { kind: 'event' as const }]) expect(daySuggestion({ ...input(), activities: [task('1'), task('2'), task('3'), { ...task('0'), ...patch }] })).toBeNull();
  });
  it('fingerprint ignores order/title/notes/revision; target/time/day changes are meaningful', () => {
    const base = input(); const fingerprint = daySuggestion(base)!.fingerprint;
    expect(daySuggestion({ ...base, activities: [...base.activities].reverse() })!.fingerprint).toBe(fingerprint);
    const withPrivateExtras = base.activities.map(item => ({ ...item, title: 'private', descriptionPlain: 'private', revision: 2 }));
    expect(daySuggestion({ ...base, activities: withPrivateExtras })!.fingerprint).toBe(fingerprint);
    expect(fingerprint).not.toContain('private');
    expect(daySuggestion({ ...base, activities: [task('new'), ...base.activities.slice(1)] })!.fingerprint).not.toBe(fingerprint);
    expect(daySuggestion({ ...base, activities: base.activities.map(item => ({ ...item, schedule: { ...item.schedule, dueTime: '19:00' } })) })!.fingerprint).not.toBe(fingerprint);
  });
  it('detector has no IO/model/commands/logging/storage/timers', () => {
    const source = readFileSync('apps/web/src/features/gika/proactivity.ts', 'utf8');
    const surface = readFileSync('apps/web/src/features/gika/GikaSuggestion.tsx', 'utf8');
    expect(surface).not.toMatch(/firebase|fetch\(|apiRequest|sendCommand|adapter|console\.|Storage|setInterval|setTimeout|speechSynthesis|SpeechRecognition/u);
    expect(source).not.toMatch(/firebase|fetch\(|apiRequest|sendCommand|adapter|console\.|Storage|setInterval|setTimeout|speechSynthesis|SpeechRecognition/u);
  });
});
