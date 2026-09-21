import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/theme.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);

// Optional editor helper; the CUI does not wait for or depend on this runtime.
if (import.meta.env.DEV) {
  import('@locator/runtime')
    .then(({ default: setupLocatorUI }) => {
      setupLocatorUI({ adapter: 'jsx', showIntro: false });
    })
    .catch(() => console.warn('Code locator unavailable. See the file map in README.md.'));
}
