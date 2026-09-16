(() => {
  const root = document.documentElement;
  const canvases = {
    green: { light: '#E8F0EB', dark: '#121A16' },
    purple: { light: '#EEEAF8', dark: '#17141D' },
    blue: { light: '#E6F0F7', dark: '#111923' },
    red: { light: '#F6EBEC', dark: '#1D1416' },
    orange: { light: '#F5ECE5', dark: '#1D1713' },
    pink: { light: '#F5EAF0', dark: '#1D141A' },
    teal: { light: '#E4F0EF', dark: '#101A1A' },
    indigo: { light: '#EAECF7', dark: '#141521' },
    amber: { light: '#F4EFDF', dark: '#1B1810' },
    brown: { light: '#EEEAE5', dark: '#1A1613' },
    monochrome: { light: '#EBEDEC', dark: '#141716' },
  };

  let appearance = 'light';
  let theme = 'green';
  try {
    appearance = localStorage.getItem('leve.appearance') || 'light';
    theme = localStorage.getItem('leve.colorTheme') || 'green';
  } catch { /* storage unavailable */ }

  if (!['light', 'dark', 'system'].includes(appearance)) appearance = 'light';
  if (!(theme in canvases)) theme = 'green';

  const dark = appearance === 'dark' || (appearance === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const effectiveAppearance = dark ? 'dark' : 'light';
  const canvas = canvases[theme][effectiveAppearance];

  root.dataset.appearance = effectiveAppearance;
  root.dataset.appearancePreference = appearance;
  root.dataset.theme = theme;
  root.style.backgroundColor = canvas;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.removeAttribute('media');
    meta.setAttribute('content', canvas);
  }
})();
