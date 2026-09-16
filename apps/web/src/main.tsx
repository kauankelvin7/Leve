import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-500.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { AuthProvider } from './features/identity/AuthProvider';
import './styles/app.css';
import './styles/glass.css';
import './styles/refinements.css';
import './styles/editorial.css';
import './styles/theme-runtime.css';
import tokens from '../../../design-tokens.json';
import { captureInstallPrompt } from './platform/pwa';
import { applyColorTheme, applyAppearance, storedColorTheme, storedAppearance } from './platform/theme';
import { installNotePresetStyles } from './platform/notePresets';

for (const [group, values] of Object.entries(tokens)) {
  for (const [name, value] of Object.entries(values)) {
    document.documentElement.style.setProperty(`--${group}-${name}`, value);
  }
}

applyColorTheme(storedColorTheme(), false);
applyAppearance(storedAppearance(), false);
installNotePresetStyles();

window.addEventListener('beforeinstallprompt', captureInstallPrompt);

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><ErrorBoundary><AuthProvider><App /></AuthProvider></ErrorBoundary></BrowserRouter></StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => {
  void navigator.serviceWorker.register('/sw.js').then(registration => {
    function announce() { if (registration.waiting) window.dispatchEvent(new CustomEvent('leve:update-ready', { detail: registration })); }
    function checkForUpdate() { if (navigator.onLine) void registration.update().catch(() => undefined); }
    announce();
    checkForUpdate();
    window.addEventListener('focus', checkForUpdate);
    window.addEventListener('online', checkForUpdate);
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => {
      if (registration.installing?.state === 'installed' && navigator.serviceWorker.controller) announce();
    }));
  }).catch(() => undefined);
});

const RELEASE_KEY = 'leve.release';
async function checkRelease() {
  if (!navigator.onLine) return;
  try {
    const response = await fetch('/api/version', { cache: 'no-store' });
    const payload = await response.json() as { release?: string };
    if (!response.ok || !payload.release) return;
    const current = sessionStorage.getItem(RELEASE_KEY);
    sessionStorage.setItem(RELEASE_KEY, payload.release);
    if (current && current !== payload.release) window.dispatchEvent(new CustomEvent('leve:release-ready'));
  } catch { /* A próxima abertura tenta novamente. */ }
}

if (import.meta.env.PROD) {
  void checkRelease();
  window.addEventListener('focus', () => void checkRelease());
  window.addEventListener('online', () => void checkRelease());
  window.setInterval(() => void checkRelease(), 5 * 60_000);
}
