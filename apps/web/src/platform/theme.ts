export const colorThemes = {
  green: { canvas: '#ECF1EE', surface: '#FAFCFA' },
  purple: { canvas: '#ECEAF6', surface: '#FDFBFF' },
  blue: { canvas: '#E7EEF5', surface: '#F6FAFE' },
  red: { canvas: '#F4EBEB', surface: '#FFFAFA' },
} as const;

export type ColorTheme = keyof typeof colorThemes;

const STORAGE_KEY = 'leve.colorTheme';

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
  document.documentElement.style.backgroundColor = colors.canvas;

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
