import {
  colorThemes,
  colorThemeIds,
  appearances,
  type Appearance,
  type ColorTheme,
  type DarkThemePalette,
  type EffectiveAppearance,
} from '../../../../packages/domain/src/themes';

export { colorThemes, colorThemeIds, appearances };
export type { ColorTheme, Appearance };

const STORAGE_KEY = 'leve.colorTheme';
const APPEARANCE_KEY = 'leve.appearance';

const DARK_TOKEN_MAP: ReadonlyArray<[keyof DarkThemePalette, string]> = [
  ['canvas', '--color-canvas'],
  ['canvasGlow', '--color-canvas-glow'],
  ['solid', '--color-solid'],
  ['glass', '--color-glass'],
  ['field', '--color-field'],
  ['border', '--color-border'],
  ['text', '--color-text'],
  ['textMuted', '--color-text-muted'],
  ['accent', '--color-action-primary'],
  ['accentHover', '--color-action-hover'],
  ['canvasAccent', '--color-canvas-accent'],
  ['surfaceMuted', '--color-surface-muted'],
  ['actionForeground', '--color-action-foreground'],
];

const DARK_DERIVED_TOKENS = [
  '--color-focus',
  '--paper-surface',
  '--color-surface',
  '--surface-highlight',
  '--editorial-line',
  '--ink-surface',
] as const;

function resolveAppearance(appearance: Appearance): EffectiveAppearance {
  if (appearance !== 'system') return appearance;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function themeColorMeta() {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
  }
  meta.removeAttribute('media');
  return meta;
}

function clearDarkPalette() {
  const root = document.documentElement;
  for (const [, cssVariable] of DARK_TOKEN_MAP) root.style.removeProperty(cssVariable);
  for (const cssVariable of DARK_DERIVED_TOKENS) root.style.removeProperty(cssVariable);
}

function applyDarkPalette(colorTheme: ColorTheme) {
  const root = document.documentElement;
  const palette = colorThemes[colorTheme].dark;

  for (const [paletteKey, cssVariable] of DARK_TOKEN_MAP) {
    root.style.setProperty(cssVariable, palette[paletteKey], 'important');
  }

  root.style.setProperty('--color-focus', palette.accent, 'important');
  root.style.setProperty('--paper-surface', palette.solid, 'important');
  root.style.setProperty('--color-surface', palette.solid, 'important');
  root.style.setProperty(
    '--surface-highlight',
    `color-mix(in srgb, ${palette.text} 12%, transparent)`,
    'important',
  );
  root.style.setProperty(
    '--editorial-line',
    `color-mix(in srgb, ${palette.text} 24%, ${palette.solid})`,
    'important',
  );
  root.style.setProperty(
    '--ink-surface',
    `color-mix(in srgb, ${palette.accent} 28%, ${palette.canvas})`,
    'important',
  );
}

function applyResolvedPalette(colorTheme: ColorTheme, appearance: EffectiveAppearance) {
  const root = document.documentElement;
  const theme = colorThemes[colorTheme];

  if (appearance === 'dark') applyDarkPalette(colorTheme);
  else clearDarkPalette();

  const canvas = appearance === 'dark' ? theme.dark.canvas : theme.canvas;
  root.style.backgroundColor = canvas;
  themeColorMeta().content = canvas;
}

export function storedColorTheme(): ColorTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in colorThemes) return stored as ColorTheme;
  } catch { /* O perfil remoto ainda define a cor quando o armazenamento local está indisponível. */ }
  return 'green';
}

export function applyColorTheme(colorTheme: ColorTheme, persist = true) {
  document.documentElement.dataset.theme = colorTheme;

  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, colorTheme); }
    catch { /* A preferência continua salva no perfil. */ }
  }

  applyResolvedPalette(colorTheme, resolveAppearance(storedAppearance()));
}

export function storedAppearance(): Appearance {
  try {
    const value = localStorage.getItem(APPEARANCE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'light';
  } catch {
    return 'light';
  }
}

export function applyAppearance(appearance: Appearance, persist = true) {
  const effective = resolveAppearance(appearance);
  const root = document.documentElement;

  root.dataset.appearance = effective;
  root.dataset.appearancePreference = appearance;
  root.style.colorScheme = effective;

  if (persist) {
    try { localStorage.setItem(APPEARANCE_KEY, appearance); }
    catch { /* preferência opcional */ }
  }

  applyResolvedPalette(storedColorTheme(), effective);
  watchSystemAppearance();
}

let systemListenerAttached = false;
function watchSystemAppearance() {
  if (systemListenerAttached) return;
  systemListenerAttached = true;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => { if (storedAppearance() === 'system') applyAppearance('system', false); };
  media.addEventListener('change', update);
  window.addEventListener('storage', event => {
    if (event.key === APPEARANCE_KEY || event.key === STORAGE_KEY) {
      applyColorTheme(storedColorTheme(), false);
      applyAppearance(storedAppearance(), false);
    }
  });
}
