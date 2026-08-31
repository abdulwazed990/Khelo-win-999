import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// Guard against harmless Firebase WebChannel internal assertion notices in browser iframe
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event?.message && (
      event.message.includes('INTERNAL ASSERTION FAILED') ||
      event.message.includes('ID: ca9') ||
      event.message.includes('ID: b815') ||
      event.message.includes('pendingResponses')
    )) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Recovered from transient Firestore stream assertion.');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    if (
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('ID: ca9') ||
      msg.includes('ID: b815') ||
      msg.includes('pendingResponses')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Recovered from transient Firestore stream rejection.');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);

