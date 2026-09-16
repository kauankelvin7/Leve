(() => {
  const root = document.documentElement;
  let appearance = 'system'; let theme = 'green';
  try { appearance = localStorage.getItem('leve.appearance') || 'system'; theme = localStorage.getItem('leve.colorTheme') || 'green'; } catch { /* storage unavailable */ }
  if (!['light', 'dark', 'system'].includes(appearance)) appearance = 'system';
  const dark = appearance === 'dark' || (appearance === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.appearance = dark ? 'dark' : 'light'; root.dataset.appearancePreference = appearance; root.dataset.theme = theme;
})();
