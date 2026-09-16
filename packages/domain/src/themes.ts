/** Shared source for validation, previews and the browser bootstrap. */
export const colorThemes = {
  green: { label: 'Verde suave', canvas: '#E8F0EB', accent: '#286345', darkAccent: '#98C9AA' },
  purple: { label: 'Roxo suave', canvas: '#EEEAF8', accent: '#674792', darkAccent: '#C5ADE9' },
  blue: { label: 'Azul suave', canvas: '#E6F0F7', accent: '#285F84', darkAccent: '#9CCAE9' },
  red: { label: 'Vermelho suave', canvas: '#F6EBEC', accent: '#913E4C', darkAccent: '#E8A9B3' },
  orange: { label: 'Terracota', canvas: '#F5ECE5', accent: '#93491F', darkAccent: '#E8B08D' },
  pink: { label: 'Rosa', canvas: '#F5EAF0', accent: '#8C3E68', darkAccent: '#E6ACCB' },
  teal: { label: 'Verde petróleo', canvas: '#E4F0EF', accent: '#226662', darkAccent: '#91CECA' },
  indigo: { label: 'Índigo', canvas: '#EAECF7', accent: '#4C5295', darkAccent: '#B5BBEF' },
  amber: { label: 'Âmbar', canvas: '#F4EFDF', accent: '#775A1D', darkAccent: '#DCC58A' },
  brown: { label: 'Cacau', canvas: '#EEEAE5', accent: '#71523F', darkAccent: '#CFB6A2' },
  monochrome: { label: 'Grafite', canvas: '#EBEDEC', accent: '#485552', darkAccent: '#BAC6C2' },
} as const;
export type ColorTheme = keyof typeof colorThemes;
export const appearances = ['light', 'dark', 'system'] as const;
export type Appearance = typeof appearances[number];
export type EffectiveAppearance = Exclude<Appearance, 'system'>;
export const colorThemeIds = Object.keys(colorThemes) as [ColorTheme, ...ColorTheme[]];
