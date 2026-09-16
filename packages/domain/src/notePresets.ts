export type NotePresetPalette = {
  surface: string;
  surfaceHover: string;
  border: string;
  accent: string;
};

export type NotePresetDefinition = {
  label: string;
  light: NotePresetPalette;
  dark: NotePresetPalette;
};

/**
 * Visual source of truth for note paper presets.
 *
 * The persisted IDs are intentionally stable because existing notes store them.
 * Components should consume this registry instead of branching on preset IDs.
 * Dark surfaces stay graphite-like while preserving a clear hue identity.
 */
export const noteColorPresets = {
  butter: {
    label: 'Geral',
    light: { surface: '#FEFCE8', surfaceHover: '#FBF7C9', border: '#D7C85B', accent: '#B39A2B' },
    dark: { surface: '#2B291F', surfaceHover: '#343126', border: '#756C3E', accent: '#D8C86C' },
  },
  studies: {
    label: 'Estudos',
    light: { surface: '#EEE8F6', surfaceHover: '#E5DCF2', border: '#BBA6D5', accent: '#7C5AA6' },
    dark: { surface: '#292532', surfaceHover: '#332D3F', border: '#6D5A83', accent: '#BCA4D9' },
  },
  personal: {
    label: 'Pessoal',
    light: { surface: '#F8E8E2', surfaceHover: '#F3DCD3', border: '#D9A796', accent: '#B56F58' },
    dark: { surface: '#332622', surfaceHover: '#3D2D28', border: '#815E52', accent: '#D79A84' },
  },
  health: {
    label: 'Saúde',
    light: { surface: '#E2EEF9', surfaceHover: '#D7E7F5', border: '#9DBCD6', accent: '#4E7EA7' },
    dark: { surface: '#202B35', surfaceHover: '#273641', border: '#536F86', accent: '#8DB9DA' },
  },
  home: {
    label: 'Casa',
    light: { surface: '#E2F5E9', surfaceHover: '#D6EFE0', border: '#9CC7AA', accent: '#4F8B64' },
    dark: { surface: '#202E25', surfaceHover: '#27382D', border: '#557461', accent: '#8AC39B' },
  },
} as const satisfies Record<string, NotePresetDefinition>;

export type NoteColorPreset = keyof typeof noteColorPresets;

export const notePresetIds = Object.keys(noteColorPresets) as NoteColorPreset[];

export function isNoteColorPreset(value: string): value is NoteColorPreset {
  return value in noteColorPresets;
}
