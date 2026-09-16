import { describe, expect, it } from 'vitest';
import { colorThemeIds, colorThemes } from '../../packages/domain/src/themes';

const requiredDarkKeys = [
  'canvas',
  'canvasGlow',
  'solid',
  'glass',
  'field',
  'border',
  'text',
  'textMuted',
  'accent',
  'accentHover',
  'canvasAccent',
  'surfaceMuted',
  'actionForeground',
] as const;

describe('color theme palettes', () => {
  it('defines a complete dark palette for every registered theme', () => {
    for (const themeId of colorThemeIds) {
      const theme = colorThemes[themeId];
      for (const key of requiredDarkKeys) expect(theme.dark[key].trim()).not.toBe('');
      expect(theme.dark.canvas).not.toBe(theme.canvas);
      expect(theme.dark.accent).toBe(theme.darkAccent);
    }
  });

  it('keeps each dark theme visually distinct', () => {
    const canvases = colorThemeIds.map(themeId => colorThemes[themeId].dark.canvas);
    expect(new Set(canvases).size).toBe(colorThemeIds.length);
  });
});
