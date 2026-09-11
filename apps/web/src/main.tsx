import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/instrument-serif/latin-400.css';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { AuthProvider } from './features/identity/AuthProvider';
import './styles/app.css';
import tokens from '../../../design-tokens.json';

for (const [group, values] of Object.entries(tokens)) {
  for (const [name, value] of Object.entries(values)) {
    document.documentElement.style.setProperty(`--${group}-${name}`, value);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><ErrorBoundary><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></ErrorBoundary></StrictMode>,
);
