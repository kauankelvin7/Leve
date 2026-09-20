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
import { hasNewEntryBundle } from './platform/release';

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
  void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
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

let releaseAnnounced = false;
async function checkRelease() {
  if (!navigator.onLine || releaseAnnounced) return;
  try {
    const response = await fetch('/?leve-update-check=1', { cache: 'no-store' });
    if (!response.ok) return;
    const html = await response.text();
    if (!hasNewEntryBundle(import.meta.url, html, window.location.origin)) return;
    releaseAnnounced = true;
    window.dispatchEvent(new CustomEvent('leve:release-ready'));
  } catch { /* A próxima abertura ou foco tenta novamente. */ }
}

if (import.meta.env.PROD) {
  void checkRelease();
  window.addEventListener('focus', () => void checkRelease());
  window.addEventListener('online', () => void checkRelease());
  window.setInterval(() => void checkRelease(), 5 * 60_000);
}
