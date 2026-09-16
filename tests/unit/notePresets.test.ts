import { describe, expect, it } from 'vitest';
import { noteInputSchema } from '../../packages/domain/src/content';
import { noteColorPresets, notePresetIds } from '../../packages/domain/src/notePresets';

const emptyDocument = { type: 'doc' as const, content: [{ type: 'paragraph' as const, content: [] }] };

function payload(paperColorPreset: string) {
  return {
    title: 'Nota',
    bodyDoc: emptyDocument,
    paperColorPreset,
    pinned: false,
    linkedDate: null,
    linkedActivityIds: [],
  };
}

describe('note color presets', () => {
  it('keeps the five persisted preset ids stable', () => {
    expect(notePresetIds).toEqual(['butter', 'studies', 'personal', 'health', 'home']);
  });

  it('defines complete and distinct light/dark palettes for every preset', () => {
    const darkSurfaces = new Set<string>();
    for (const id of notePresetIds) {
      const preset = noteColorPresets[id];
      expect(preset.label.trim()).not.toBe('');
      for (const appearance of ['light', 'dark'] as const) {
        for (const key of ['surface', 'surfaceHover', 'border', 'accent'] as const) {
          expect(preset[appearance][key]).toMatch(/^#[0-9A-F]{6}$/i);
        }
      }
      expect(preset.dark.surface).not.toBe(preset.light.surface);
      darkSurfaces.add(preset.dark.surface);
    }
    expect(darkSurfaces.size).toBe(notePresetIds.length);
  });

  it('keeps the domain schema aligned with every registered preset', () => {
    for (const id of notePresetIds) expect(noteInputSchema.safeParse(payload(id)).success).toBe(true);
    expect(noteInputSchema.safeParse(payload('unknown-preset')).success).toBe(false);
  });
});
