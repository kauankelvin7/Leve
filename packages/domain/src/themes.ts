/** Shared source for validation, previews and the browser bootstrap. */
export const appearances = ['light', 'dark', 'system'] as const;
export type Appearance = typeof appearances[number];
export type EffectiveAppearance = Exclude<Appearance, 'system'>;

export type DarkThemePalette = {
  canvas: string;
  canvasGlow: string;
  solid: string;
  glass: string;
  field: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  canvasAccent: string;
  surfaceMuted: string;
  actionForeground: string;
};

function defineTheme<const Label extends string>(
  label: Label,
  canvas: string,
  accent: string,
  dark: DarkThemePalette,
) {
  return { label, canvas, accent, darkAccent: dark.accent, dark } as const;
}

export const colorThemes = {
  green: defineTheme('Verde suave', '#E8F0EB', '#286345', {
    canvas: '#121A16',
    canvasGlow: '#18221C',
    solid: '#202B25',
    glass: 'rgba(32, 43, 37, 0.88)',
    field: '#18221D',
    border: '#536A5C',
    text: '#F0F5F1',
    textMuted: '#B3C2B8',
    accent: '#98C9AA',
    accentHover: '#B4D8C0',
    canvasAccent: '#294235',
    surfaceMuted: '#18221D',
    actionForeground: '#132019',
  }),
  purple: defineTheme('Roxo suave', '#EEEAF8', '#674792', {
    canvas: '#17141D',
    canvasGlow: '#211B29',
    solid: '#26202F',
    glass: 'rgba(38, 32, 47, 0.88)',
    field: '#1E1926',
    border: '#61556F',
    text: '#F5F1F8',
    textMuted: '#C4B9CF',
    accent: '#C5ADE9',
    accentHover: '#D6C2F0',
    canvasAccent: '#3A2C4C',
    surfaceMuted: '#1E1926',
    actionForeground: '#1A1224',
  }),
  blue: defineTheme('Azul suave', '#E6F0F7', '#285F84', {
    canvas: '#111923',
    canvasGlow: '#172330',
    solid: '#1D2A36',
    glass: 'rgba(29, 42, 54, 0.88)',
    field: '#17222D',
    border: '#52697B',
    text: '#F0F5F9',
    textMuted: '#B5C5D1',
    accent: '#9CCAE9',
    accentHover: '#B7D9EF',
    canvasAccent: '#274158',
    surfaceMuted: '#17222D',
    actionForeground: '#101C26',
  }),
  red: defineTheme('Vermelho suave', '#F6EBEC', '#913E4C', {
    canvas: '#1D1416',
    canvasGlow: '#281A1E',
    solid: '#302126',
    glass: 'rgba(48, 33, 38, 0.88)',
    field: '#261A1E',
    border: '#74535A',
    text: '#F8F1F2',
    textMuted: '#D0B8BD',
    accent: '#E8A9B3',
    accentHover: '#F0C0C7',
    canvasAccent: '#4A2931',
    surfaceMuted: '#261A1E',
    actionForeground: '#261216',
  }),
  orange: defineTheme('Terracota', '#F5ECE5', '#93491F', {
    canvas: '#1D1713',
    canvasGlow: '#281F1A',
    solid: '#30251F',
    glass: 'rgba(48, 37, 31, 0.88)',
    field: '#251D18',
    border: '#745D50',
    text: '#F8F3EF',
    textMuted: '#D0BEB2',
    accent: '#E8B08D',
    accentHover: '#F0C4A8',
    canvasAccent: '#4A3225',
    surfaceMuted: '#251D18',
    actionForeground: '#24170F',
  }),
  pink: defineTheme('Rosa', '#F5EAF0', '#8C3E68', {
    canvas: '#1D141A',
    canvasGlow: '#281A24',
    solid: '#30212B',
    glass: 'rgba(48, 33, 43, 0.88)',
    field: '#261A22',
    border: '#735469',
    text: '#F8F1F6',
    textMuted: '#D0B8C8',
    accent: '#E6ACCB',
    accentHover: '#EFC1D8',
    canvasAccent: '#482A3C',
    surfaceMuted: '#261A22',
    actionForeground: '#24131D',
  }),
  teal: defineTheme('Verde petróleo', '#E4F0EF', '#226662', {
    canvas: '#101A1A',
    canvasGlow: '#162424',
    solid: '#1C2C2B',
    glass: 'rgba(28, 44, 43, 0.88)',
    field: '#162322',
    border: '#4D6D6A',
    text: '#EEF6F5',
    textMuted: '#B1C8C5',
    accent: '#91CECA',
    accentHover: '#AFDDD9',
    canvasAccent: '#244542',
    surfaceMuted: '#162322',
    actionForeground: '#0E201F',
  }),
  indigo: defineTheme('Índigo', '#EAECF7', '#4C5295', {
    canvas: '#141521',
    canvasGlow: '#1B1D2D',
    solid: '#232638',
    glass: 'rgba(35, 38, 56, 0.88)',
    field: '#1B1E2E',
    border: '#565D7C',
    text: '#F2F3FA',
    textMuted: '#BCC0D6',
    accent: '#B5BBEF',
    accentHover: '#CBD0F5',
    canvasAccent: '#30365A',
    surfaceMuted: '#1B1E2E',
    actionForeground: '#15172B',
  }),
  amber: defineTheme('Âmbar', '#F4EFDF', '#775A1D', {
    canvas: '#1B1810',
    canvasGlow: '#252116',
    solid: '#2D281B',
    glass: 'rgba(45, 40, 27, 0.88)',
    field: '#231F15',
    border: '#6F6548',
    text: '#F7F5EC',
    textMuted: '#CCC5AC',
    accent: '#DCC58A',
    accentHover: '#E7D6A9',
    canvasAccent: '#453A1F',
    surfaceMuted: '#231F15',
    actionForeground: '#211A0C',
  }),
  brown: defineTheme('Cacau', '#EEEAE5', '#71523F', {
    canvas: '#1A1613',
    canvasGlow: '#231D19',
    solid: '#2B2420',
    glass: 'rgba(43, 36, 32, 0.88)',
    field: '#221C19',
    border: '#6C5B50',
    text: '#F6F2EF',
    textMuted: '#C9BBB1',
    accent: '#CFB6A2',
    accentHover: '#DEC9B9',
    canvasAccent: '#403127',
    surfaceMuted: '#221C19',
    actionForeground: '#20150F',
  }),
  monochrome: defineTheme('Grafite', '#EBEDEC', '#485552', {
    canvas: '#141716',
    canvasGlow: '#1B1F1E',
    solid: '#242927',
    glass: 'rgba(36, 41, 39, 0.88)',
    field: '#1B201E',
    border: '#5B6662',
    text: '#F1F4F3',
    textMuted: '#BAC3C0',
    accent: '#BAC6C2',
    accentHover: '#D0D8D5',
    canvasAccent: '#333B38',
    surfaceMuted: '#1B201E',
    actionForeground: '#151B19',
  }),
} as const;

export type ColorTheme = keyof typeof colorThemes;
export const colorThemeIds = Object.keys(colorThemes) as [ColorTheme, ...ColorTheme[]];
