import { colorThemes, colorThemeIds, appearances, type ColorTheme, type Appearance } from '../../../../packages/domain/src/themes';
export { colorThemes, colorThemeIds, appearances };
export type { ColorTheme, Appearance };

const STORAGE_KEY = 'leve.colorTheme';
const APPEARANCE_KEY = 'leve.appearance';

export function storedColorTheme(): ColorTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in colorThemes) return stored as ColorTheme;
  } catch { /* O perfil remoto ainda define a cor quando o armazenamento local está indisponível. */ }
  return 'green';
}

export function applyColorTheme(colorTheme: ColorTheme, persist = true) {
  const colors = colorThemes[colorTheme];
  document.documentElement.dataset.theme = colorTheme;
  const appearance = storedAppearance();
  document.documentElement.style.backgroundColor = appearance === 'dark'
    ? '#171C1A'
    : colors.canvas;

  let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.append(themeColor);
  }
  themeColor.content = colors.canvas;

  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, colorTheme); }
    catch { /* A preferência continua salva no perfil. */ }
  }
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
  const effective = appearance === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : appearance;
  document.documentElement.dataset.appearance = effective;
  document.documentElement.dataset.appearancePreference = appearance;
  document.documentElement.style.colorScheme = effective;
  const canvas = effective === 'dark' ? '#171C1A' : colorThemes[storedColorTheme()].canvas;
  document.documentElement.style.setProperty('--color-canvas', canvas);
  document.documentElement.style.setProperty('--color-solid', effective === 'dark' ? '#242C28' : '#FFFDFA');
  document.documentElement.style.setProperty('--color-text', effective === 'dark' ? '#EDF1EE' : '#202C27');
  document.documentElement.style.setProperty('--color-text-muted', effective === 'dark' ? '#BAC6BE' : '#4D6056');
  document.documentElement.style.setProperty('--color-field', effective === 'dark' ? '#1C2420' : '#F7F8F5');
  document.documentElement.style.backgroundColor = canvas;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim();
  if (persist) try { localStorage.setItem(APPEARANCE_KEY, appearance); } catch { /* preferência opcional */ }
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
