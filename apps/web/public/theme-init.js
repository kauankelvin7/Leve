(() => {
  const root = document.documentElement;
  let appearance = 'light';
  let theme = 'green';
  try {
    appearance = localStorage.getItem('leve.appearance') || 'light';
    theme = localStorage.getItem('leve.colorTheme') || 'green';
  } catch { /* storage unavailable */ }
  if (!['light', 'dark', 'system'].includes(appearance)) appearance = 'light';
  const dark = appearance === 'dark' || (appearance === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.appearance = dark ? 'dark' : 'light';
  root.dataset.appearancePreference = appearance;
  root.dataset.theme = theme;
})();
