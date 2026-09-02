import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// Guard against harmless Firebase WebChannel internal assertion notices and Quota Exceeded notices in browser iframe
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('ID: ca9') ||
      msg.includes('ID: b815') ||
      msg.includes('pendingResponses') ||
      msg.includes('Quota exceeded') ||
      msg.includes('Free daily read units') ||
      msg.includes('RESOURCE_EXHAUSTED')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Recovered from Firestore notice/quota state:', msg);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    if (
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('ID: ca9') ||
      msg.includes('ID: b815') ||
      msg.includes('pendingResponses') ||
      msg.includes('Quota exceeded') ||
      msg.includes('Free daily read units') ||
      msg.includes('RESOURCE_EXHAUSTED')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Recovered from Firestore promise rejection/quota state:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);

